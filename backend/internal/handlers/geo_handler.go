package handlers

import (
	"log"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type GeoHandler struct {
	client *http.Client
}

func NewGeoHandler() *GeoHandler {
	return &GeoHandler{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// Open-Meteo Geocoding Response Structures
type GeocodingResult struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Country   string  `json:"country"`
	Admin1    string  `json:"admin1"`
	Timezone  string  `json:"timezone"`
}

type GeocodingResponse struct {
	Results []GeocodingResult `json:"results"`
}

// Open-Meteo Weather Response Structures
type OpenMeteoWeatherResponse struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timezone  string  `json:"timezone"`
	Current   struct {
		Time                string  `json:"time"`
		Temperature2m       float64 `json:"temperature_2m"`
		RelativeHumidity2m  int     `json:"relative_humidity_2m"`
		ApparentTemperature float64 `json:"apparent_temperature"`
		Precipitation       float64 `json:"precipitation"`
		WeatherCode         int     `json:"weather_code"`
		WindSpeed10m        float64 `json:"wind_speed_10m"`
	} `json:"current"`
	Daily struct {
		Time             []string  `json:"time"`
		WeatherCode      []int     `json:"weather_code"`
		Temperature2mMax []float64 `json:"temperature_2m_max"`
		Temperature2mMin []float64 `json:"temperature_2m_min"`
		PrecipitationSum []float64 `json:"precipitation_sum"`
	} `json:"daily"`
}

type FormattedWeatherResponse struct {
	Latitude      float64        `json:"latitude"`
	Longitude     float64        `json:"longitude"`
	Temperature   float64        `json:"temperature"`
	FeelsLike     float64        `json:"feels_like"`
	Humidity      int            `json:"humidity"`
	WindSpeed     float64        `json:"wind_speed"`
	Precipitation float64        `json:"precipitation"`
	WeatherCode   int            `json:"weather_code"`
	Condition     string         `json:"condition"`
	Icon          string         `json:"icon"`
	DailyForecast []DailyWeather `json:"daily_forecast"`
}

type DailyWeather struct {
	Date        string  `json:"date"`
	MaxTemp     float64 `json:"max_temp"`
	MinTemp     float64 `json:"min_temp"`
	Condition   string  `json:"condition"`
	WeatherCode int     `json:"weather_code"`
	PrecipSum   float64 `json:"precipitation_sum"`
}

func (h *GeoHandler) SearchLocations(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Query parameter 'q' is required"})
	}

	apiURL := fmt.Sprintf("https://geocoding-api.open-meteo.com/v1/search?name=%s&count=10&language=en&format=json", url.QueryEscape(query))
	resp, err := h.client.Get(apiURL)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to query geocoding API"})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to read response body", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read response body"})
	}

	var geoResp GeocodingResponse
	if err := json.Unmarshal(body, &geoResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse geocoding data"})
	}

	if geoResp.Results == nil {
		geoResp.Results = []GeocodingResult{}
	}

	return c.JSON(geoResp.Results)
}

func (h *GeoHandler) GetWeather(c *fiber.Ctx) error {
	latStr := c.Query("lat", "35.6762") // Default Tokyo
	lonStr := c.Query("lon", "139.6503")

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid latitude"})
	}

	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid longitude"})
	}

	apiURL := fmt.Sprintf(
		"https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto",
		lat, lon,
	)

	resp, err := h.client.Get(apiURL)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to query Open-Meteo weather API"})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to read weather response", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read weather response"})
	}

	var weatherRaw OpenMeteoWeatherResponse
	if err := json.Unmarshal(body, &weatherRaw); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse weather data"})
	}

	cond, icon := weatherCodeToCondition(weatherRaw.Current.WeatherCode)

	dailyList := []DailyWeather{}
	for i := 0; i < len(weatherRaw.Daily.Time); i++ {
		dCond, _ := weatherCodeToCondition(weatherRaw.Daily.WeatherCode[i])
		dailyList = append(dailyList, DailyWeather{
			Date:        weatherRaw.Daily.Time[i],
			MaxTemp:     weatherRaw.Daily.Temperature2mMax[i],
			MinTemp:     weatherRaw.Daily.Temperature2mMin[i],
			Condition:   dCond,
			WeatherCode: weatherRaw.Daily.WeatherCode[i],
			PrecipSum:   weatherRaw.Daily.PrecipitationSum[i],
		})
	}

	formatted := FormattedWeatherResponse{
		Latitude:      weatherRaw.Latitude,
		Longitude:     weatherRaw.Longitude,
		Temperature:   weatherRaw.Current.Temperature2m,
		FeelsLike:     weatherRaw.Current.ApparentTemperature,
		Humidity:      weatherRaw.Current.RelativeHumidity2m,
		WindSpeed:     weatherRaw.Current.WindSpeed10m,
		Precipitation: weatherRaw.Current.Precipitation,
		WeatherCode:   weatherRaw.Current.WeatherCode,
		Condition:     cond,
		Icon:          icon,
		DailyForecast: dailyList,
	}

	return c.JSON(formatted)
}

type RouteRequest struct {
	FromLat float64 `json:"from_lat"`
	FromLon float64 `json:"from_lon"`
	ToLat   float64 `json:"to_lat"`
	ToLon   float64 `json:"to_lon"`
}

type RouteResponse struct {
	DistanceKm float64 `json:"distance_km"`
	WalkMins   int     `json:"walk_mins"`
	DriveMins  int     `json:"drive_mins"`
	TransitMin int     `json:"transit_mins"`
}

func (h *GeoHandler) CalculateRoute(c *fiber.Ctx) error {
	var req RouteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	// Haversine formula calculation
	const earthRadiusKm = 6371.0

	dLat := (req.ToLat - req.FromLat) * (math.Pi / 180.0)
	dLon := (req.ToLon - req.FromLon) * (math.Pi / 180.0)

	lat1 := req.FromLat * (math.Pi / 180.0)
	lat2 := req.ToLat * (math.Pi / 180.0)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(lat1)*math.Cos(lat2)
	cVal := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	distanceKm := earthRadiusKm * cVal

	// Estimated times: Walking ~ 4.5 km/h, Driving ~ 40 km/h in city, Transit ~ 30 km/h
	walkMins := int(math.Round((distanceKm / 4.5) * 60))
	driveMins := int(math.Round((distanceKm / 40.0) * 60))
	transitMins := int(math.Round((distanceKm / 30.0) * 60))

	return c.JSON(RouteResponse{
		DistanceKm: math.Round(distanceKm*10) / 10,
		WalkMins:   walkMins,
		DriveMins:  driveMins,
		TransitMin: transitMins,
	})
}

// Maps WMO standard weather code to condition name & visual icon
func weatherCodeToCondition(code int) (string, string) {
	switch code {
	case 0:
		return "Clear Sky", "wb_sunny"
	case 1:
		return "Mainly Clear", "partly_cloudy_day"
	case 2:
		return "Partly Cloudy", "partly_cloudy_day"
	case 3:
		return "Overcast", "cloud"
	case 45, 48:
		return "Foggy", "foggy"
	case 51, 53, 55:
		return "Drizzle", "water_drop"
	case 61, 63, 65:
		return "Rain", "rainy"
	case 71, 73, 75:
		return "Snow", "ac_unit"
	case 80, 81, 82:
		return "Rain Showers", "shower"
	case 95, 96, 99:
		return "Thunderstorm", "thunderstorm"
	default:
		return "Pleasant", "filter_drama"
	}
}
