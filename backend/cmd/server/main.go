package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"github.com/v-urit/travel/internal/auth"
	"github.com/v-urit/travel/internal/config"
	"github.com/v-urit/travel/internal/db"
	"github.com/v-urit/travel/internal/handlers"
	"github.com/v-urit/travel/internal/middleware"
)

func main() {
	cfg := config.Load()

	// 1. Connect to PostgreSQL
	sqlDB, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to open database connection: %v", err)
	}
	defer sqlDB.Close()

	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Failed to ping PostgreSQL: %v", err)
	}
	log.Println("[Database] Connected successfully to PostgreSQL ('travel')")

	queries := db.New(sqlDB)

	// 2. Seed initial demo data (Alex Chen & Tokyo Trip) if empty
	seedDemoData(context.Background(), queries)

	// 3. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName:      "Wanderly Travel API v1.0",
		ServerHeader: "Fiber",
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			return true
		},
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

	// Health Check
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"service":   "wanderly-travel-backend",
		})
	})

	// 4. Initialize Handlers
	authHandler := handlers.NewAuthHandler(queries, cfg)
	tripHandler := handlers.NewTripHandler(queries)
	itineraryHandler := handlers.NewItineraryHandler(queries)
	todoHandler := handlers.NewTodoHandler(queries)
	packingHandler := handlers.NewPackingHandler(queries)
	expenseHandler := handlers.NewExpenseHandler(queries)
	placeHandler := handlers.NewPlaceHandler(queries)
	documentHandler := handlers.NewDocumentHandler(queries)
	geoHandler := handlers.NewGeoHandler()

	// 5. Setup Routes
	api := app.Group("/api")

	// Auth routes (Public)
	authGroup := api.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/refresh", authHandler.Refresh)
	authGroup.Get("/me", middleware.Protected(cfg.JWTSecret), authHandler.Me)

	// Real Weather & Geocoding (Public & fast)
	api.Get("/weather", geoHandler.GetWeather)
	api.Get("/locations/search", geoHandler.SearchLocations)
	api.Post("/routes", geoHandler.CalculateRoute)

	// Protected Application Routes
	protected := api.Group("", middleware.Protected(cfg.JWTSecret))

	// Trips
	protected.Get("/trips", tripHandler.ListTrips)
	protected.Post("/trips", tripHandler.CreateTrip)
	protected.Get("/trips/:id", tripHandler.GetTrip)
	protected.Put("/trips/:id", tripHandler.UpdateTrip)
	protected.Delete("/trips/:id", tripHandler.DeleteTrip)

	// Itinerary
	protected.Get("/trips/:id/itinerary", itineraryHandler.ListDays)
	protected.Post("/trips/:id/activities", itineraryHandler.CreateActivity)
	protected.Delete("/trips/:id/activities/:activityId", itineraryHandler.DeleteActivity)

	// Todos & Checklist (Date-specific interactive tasks)
	protected.Get("/trips/:id/todos", todoHandler.ListTodos)
	protected.Post("/trips/:id/todos", todoHandler.CreateTodo)
	protected.Put("/trips/:id/todos/:todoId/toggle", todoHandler.ToggleTodo)
	protected.Delete("/trips/:id/todos/:todoId", todoHandler.DeleteTodo)

	// Packing
	protected.Get("/trips/:id/packing", packingHandler.ListPacking)
	protected.Post("/trips/:id/packing", packingHandler.CreatePackingItem)
	protected.Put("/trips/:id/packing/:itemId/toggle", packingHandler.TogglePackingItem)
	protected.Delete("/trips/:id/packing/:itemId", packingHandler.DeletePackingItem)

	// Expenses
	protected.Get("/trips/:id/expenses", expenseHandler.ListExpenses)
	protected.Get("/trips/:id/expenses/summary", expenseHandler.GetExpenseSummary)
	protected.Post("/trips/:id/expenses", expenseHandler.CreateExpense)
	protected.Delete("/trips/:id/expenses/:expenseId", expenseHandler.DeleteExpense)

	// Places
	protected.Get("/trips/:id/places", placeHandler.ListPlaces)
	protected.Post("/trips/:id/places", placeHandler.CreatePlace)
	protected.Put("/trips/:id/places/:placeId/toggle", placeHandler.ToggleVisited)
	protected.Delete("/trips/:id/places/:placeId", placeHandler.DeletePlace)

	// Documents
	protected.Get("/trips/:id/documents", documentHandler.ListDocuments)
	protected.Post("/trips/:id/documents", documentHandler.CreateDocument)
	protected.Delete("/trips/:id/documents/:docId", documentHandler.DeleteDocument)

	// 6. Start listening
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[Server] Starting Wanderly backend on port %s...", cfg.Port)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func seedDemoData(ctx context.Context, q *db.Queries) {
	demoEmail := "alex.chen@craft.co"
	user, err := q.GetUserByEmail(ctx, demoEmail)
	if err != nil {
		// Create default demo user
		hashedPassword, _ := auth.HashPassword("13802002")
		user, err = q.CreateUser(ctx, db.CreateUserParams{
			Email:        demoEmail,
			PasswordHash: hashedPassword,
			Name:         "Alex Chen",
			AvatarUrl:    sql.NullString{String: "/images/avatar-alex.png", Valid: true},
			Currency:     sql.NullString{String: "USD", Valid: true},
		})
		if err != nil {
			log.Printf("[Seed] Warning: failed to seed user: %v", err)
			return
		}
		log.Printf("[Seed] Demo user created: %s (Password: 13802002)", demoEmail)
	}

	// Check if user has trips
	trips, _ := q.ListTripsByUserID(ctx, user.ID)
	if len(trips) == 0 {
		startDate, _ := time.Parse("2006-01-02", "2027-04-18")
		endDate, _ := time.Parse("2006-01-02", "2027-04-27")

		tokyoTrip, err := q.CreateTrip(ctx, db.CreateTripParams{
			UserID:         user.ID,
			Title:          "Tokyo, Japan",
			Destination:    "Tokyo",
			Country:        "Japan",
			Latitude:       35.6762,
			Longitude:      139.6503,
			StartDate:      startDate,
			EndDate:        endDate,
			Status:         "upcoming",
			CoverImageUrl:  sql.NullString{String: "/images/tokyo-tower.png", Valid: true},
			TravelersCount: 2,
			TravelerNames:  "Alex & Maya",
			TagLabel:       sql.NullString{String: "Spring Cherry Blossoms 2027", Valid: true},
		})
		if err != nil {
			log.Printf("[Seed] Warning: failed to seed trip: %v", err)
			return
		}

		// Secondary trips
		kyotoStart, _ := time.Parse("2006-01-02", "2027-05-12")
		kyotoEnd, _ := time.Parse("2006-01-02", "2027-05-18")
		_, _ = q.CreateTrip(ctx, db.CreateTripParams{
			UserID:         user.ID,
			Title:          "Kyoto Cultural Immersion",
			Destination:    "Kyoto",
			Country:        "Japan",
			Latitude:       35.0116,
			Longitude:      135.7681,
			StartDate:      kyotoStart,
			EndDate:        kyotoEnd,
			Status:         "upcoming",
			CoverImageUrl:  sql.NullString{String: "/images/kyoto-machiya.png", Valid: true},
			TravelersCount: 1,
			TravelerNames:  "Alex Chen",
			TagLabel:       sql.NullString{String: "Machiya Architecture Study", Valid: true},
		})

		swissStart, _ := time.Parse("2006-01-02", "2027-07-02")
		swissEnd, _ := time.Parse("2006-01-02", "2027-07-10")
		_, _ = q.CreateTrip(ctx, db.CreateTripParams{
			UserID:         user.ID,
			Title:          "Swiss Alps High Passes",
			Destination:    "Zermatt",
			Country:        "Switzerland",
			Latitude:       45.9763,
			Longitude:      7.7491,
			StartDate:      swissStart,
			EndDate:        swissEnd,
			Status:         "draft",
			CoverImageUrl:  sql.NullString{String: "/images/swiss-alps.png", Valid: true},
			TravelersCount: 2,
			TravelerNames:  "Alex & Maya",
			TagLabel:       sql.NullString{String: "Alpine Trekking & Design", Valid: true},
		})

		// Seed Days for Tokyo Trip
		day1, _ := q.CreateItineraryDay(ctx, db.CreateItineraryDayParams{
			TripID:    tokyoTrip.ID,
			DayNumber: 1,
			Date:      startDate,
			Title:     "Arrival & Shibuya Twilight",
			Notes:     sql.NullString{String: "Land at Haneda, take Keikyu line to Shibuya Excel Hotel Tokyu", Valid: true},
		})

		day2, _ := q.CreateItineraryDay(ctx, db.CreateItineraryDayParams{
			TripID:    tokyoTrip.ID,
			DayNumber: 2,
			Date:      startDate.AddDate(0, 0, 1),
			Title:     "Aoyama Architecture & Nezu Garden",
			Notes:     sql.NullString{String: "Minimalist architecture walk along Omotesando, Nezu Museum, Fuglen coffee", Valid: true},
		})

		_, _ = q.CreateItineraryDay(ctx, db.CreateItineraryDayParams{
			TripID:    tokyoTrip.ID,
			DayNumber: 3,
			Date:      startDate.AddDate(0, 0, 2),
			Title:     "Ginza Contemporary & Tsukiji Morning",
			Notes:     sql.NullString{String: "Early sushi breakfast, gallery hopping in Ginza", Valid: true},
		})

		// Seed Activities for Day 1
		if day1.ID != uuid.Nil {
			_, _ = q.CreateActivity(ctx, db.CreateActivityParams{
				DayID:        day1.ID,
				TimeSlot:     "morning",
				Title:        "Land at Haneda Airport (HND)",
				LocationName: sql.NullString{String: "Haneda International Terminal 3", Valid: true},
				Latitude:     sql.NullFloat64{Float64: 35.5494, Valid: true},
				Longitude:    sql.NullFloat64{Float64: 139.7798, Valid: true},
				StartTime:    sql.NullString{String: "09:30", Valid: true},
				EndTime:      sql.NullString{String: "11:00", Valid: true},
				BookingRef:   sql.NullString{String: "NH-106", Valid: true},
				Cost:         sql.NullString{String: "0.00", Valid: true},
				Currency:     sql.NullString{String: "USD", Valid: true},
				Notes:        sql.NullString{String: "Pick up pocket Wi-Fi and Pasmo transit card", Valid: true},
				SortOrder:    1,
			})

			_, _ = q.CreateActivity(ctx, db.CreateActivityParams{
				DayID:        day1.ID,
				TimeSlot:     "afternoon",
				Title:        "Check in at Shibuya Hotel & Unpack",
				LocationName: sql.NullString{String: "Cerulean Tower Tokyu Hotel", Valid: true},
				Latitude:     sql.NullFloat64{Float64: 35.6560, Valid: true},
				Longitude:    sql.NullFloat64{Float64: 139.6995, Valid: true},
				StartTime:    sql.NullString{String: "14:00", Valid: true},
				EndTime:      sql.NullString{String: "16:00", Valid: true},
				Cost:         sql.NullString{String: "320.00", Valid: true},
				Currency:     sql.NullString{String: "USD", Valid: true},
				SortOrder:    2,
			})

			_, _ = q.CreateActivity(ctx, db.CreateActivityParams{
				DayID:        day1.ID,
				TimeSlot:     "evening",
				Title:        "Specialty Pour-Over & Shibuya Sky Dusk",
				LocationName: sql.NullString{String: "About Life Coffee Brewers & Shibuya Scramble", Valid: true},
				Latitude:     sql.NullFloat64{Float64: 35.6580, Valid: true},
				Longitude:    sql.NullFloat64{Float64: 139.7016, Valid: true},
				StartTime:    sql.NullString{String: "17:30", Valid: true},
				EndTime:      sql.NullString{String: "19:30", Valid: true},
				BookingRef:   sql.NullString{String: "SKY-4892", Valid: true},
				Cost:         sql.NullString{String: "42.00", Valid: true},
				Currency:     sql.NullString{String: "USD", Valid: true},
				Notes:        sql.NullString{String: "Panoramic sunset view over Tokyo Tower and Shinjuku", Valid: true},
				SortOrder:    3,
			})
		}

		// Seed Activities for Day 2
		if day2.ID != uuid.Nil {
			_, _ = q.CreateActivity(ctx, db.CreateActivityParams{
				DayID:        day2.ID,
				TimeSlot:     "morning",
				Title:        "Nezu Museum & Kengo Kuma Bamboo Path",
				LocationName: sql.NullString{String: "Minami-Aoyama, Minato City", Valid: true},
				Latitude:     sql.NullFloat64{Float64: 35.6622, Valid: true},
				Longitude:    sql.NullFloat64{Float64: 139.7180, Valid: true},
				StartTime:    sql.NullString{String: "10:00", Valid: true},
				EndTime:      sql.NullString{String: "12:30", Valid: true},
				Cost:         sql.NullString{String: "28.00", Valid: true},
				Currency:     sql.NullString{String: "USD", Valid: true},
				Notes:        sql.NullString{String: "Stroll through traditional Japanese tea house gardens", Valid: true},
				SortOrder:    1,
			})
		}

		// Seed Date-Specific Todos & Checklist
		_, _ = q.CreateTodo(ctx, db.CreateTodoParams{
			TripID:      tokyoTrip.ID,
			Title:       "Pick up JR 7-Day National Pass at Haneda",
			DueDate:     sql.NullTime{Time: startDate, Valid: true},
			Category:    "booking",
			IsCompleted: true,
			Priority:    "high",
			Notes:       sql.NullString{String: "Exchange order voucher at JR East Travel Service Center", Valid: true},
		})

		_, _ = q.CreateTodo(ctx, db.CreateTodoParams{
			TripID:      tokyoTrip.ID,
			Title:       "Confirm Omakase reservation at Sushi Sawada",
			DueDate:     sql.NullTime{Time: startDate.AddDate(0, 0, 2), Valid: true},
			Category:    "booking",
			IsCompleted: false,
			Priority:    "high",
			Notes:       sql.NullString{String: "Strict 18:00 seating. No strong perfume allowed.", Valid: true},
		})

		_, _ = q.CreateTodo(ctx, db.CreateTodoParams{
			TripID:      tokyoTrip.ID,
			Title:       "Verify eSIM & Pocket Wi-Fi activation QR code",
			DueDate:     sql.NullTime{Time: startDate.AddDate(0, 0, -1), Valid: true},
			Category:    "prep",
			IsCompleted: true,
			Priority:    "medium",
			Notes:       sql.NullString{String: "Ubigi Japan 10GB data profile downloaded", Valid: true},
		})

		_, _ = q.CreateTodo(ctx, db.CreateTodoParams{
			TripID:      tokyoTrip.ID,
			Title:       "Check in for All Nippon Airways flight NH-106",
			DueDate:     sql.NullTime{Time: startDate.AddDate(0, 0, -1), Valid: true},
			Category:    "documents",
			IsCompleted: false,
			Priority:    "high",
			Notes:       sql.NullString{String: "Online check-in opens 24h before departure", Valid: true},
		})

		_, _ = q.CreateTodo(ctx, db.CreateTodoParams{
			TripID:      tokyoTrip.ID,
			Title:       "Buy Tokyo Metro 72-Hour Pass at Bic Camera",
			DueDate:     sql.NullTime{Time: startDate.AddDate(0, 0, 1), Valid: true},
			Category:    "prep",
			IsCompleted: false,
			Priority:    "medium",
			Notes:       sql.NullString{String: "1,500 JPY per pass for unlimited subway rides", Valid: true},
		})

		// Seed Packing Items
		packingItems := []struct {
			title string
			cat   string
			qty   int32
			done  bool
		}{
			{"Passport & Visa Copies", "documents", 2, true},
			{"Leica M11 + 35mm Summicron", "electronics", 1, true},
			{"Linen button-down shirts", "clothing", 4, true},
			{"Merino wool travel socks", "clothing", 5, true},
			{"Type A/B Japan plug adapter", "electronics", 2, true},
			{"Noise cancelling headphones", "electronics", 1, true},
			{"Aesop travel grooming kit", "toiletries", 1, false},
			{"Coin pouch for 100/500 JPY coins", "essentials", 1, true},
			{"Comfortable walking sneakers (On/Hoka)", "clothing", 2, false},
			{"Universal 65W GaN Charger", "electronics", 1, false},
		}
		for _, p := range packingItems {
			_, _ = q.CreatePackingItem(ctx, db.CreatePackingItemParams{
				TripID:   tokyoTrip.ID,
				Title:    p.title,
				Category: p.cat,
				Quantity: p.qty,
				IsPacked: p.done,
			})
		}

		// Seed Expenses
		_, _ = q.CreateExpense(ctx, db.CreateExpenseParams{
			TripID:      tokyoTrip.ID,
			Title:       "ANA Roundtrip Flight (SFO - HND)",
			Category:    "transit",
			Amount:      "1420.00",
			Currency:    "USD",
			ExpenseDate: startDate.AddDate(0, -2, 0),
			PayerName:   sql.NullString{String: "Alex Chen", Valid: true},
			Notes:       sql.NullString{String: "Direct flight premium economy", Valid: true},
		})

		_, _ = q.CreateExpense(ctx, db.CreateExpenseParams{
			TripID:      tokyoTrip.ID,
			Title:       "Cerulean Tower 5 Nights Deposit",
			Category:    "stay",
			Amount:      "950.00",
			Currency:    "USD",
			ExpenseDate: startDate.AddDate(0, -1, 0),
			PayerName:   sql.NullString{String: "Alex Chen", Valid: true},
		})

		_, _ = q.CreateExpense(ctx, db.CreateExpenseParams{
			TripID:      tokyoTrip.ID,
			Title:       "Shibuya Sky Sunset Observation Tickets",
			Category:    "activities",
			Amount:      "42.00",
			Currency:    "USD",
			ExpenseDate: startDate,
			PayerName:   sql.NullString{String: "Alex Chen", Valid: true},
		})

		// Seed Saved Places
		_, _ = q.CreateSavedPlace(ctx, db.CreateSavedPlaceParams{
			TripID:       tokyoTrip.ID,
			Title:        "Fuglen Tokyo",
			Category:     "cafe",
			Address:      sql.NullString{String: "1-7-11 Tomigaya, Shibuya-ku", Valid: true},
			Neighborhood: sql.NullString{String: "Yoyogi-Koen", Valid: true},
			Latitude:     sql.NullFloat64{Float64: 35.6672, Valid: true},
			Longitude:    sql.NullFloat64{Float64: 139.6914, Valid: true},
			Rating:       sql.NullString{String: "4.8", Valid: true},
			Notes:        sql.NullString{String: "Nordic vintage furniture & world-class light roast espresso", Valid: true},
			ImageUrl:     sql.NullString{String: "/images/tokyo-coffee.png", Valid: true},
			IsVisited:    false,
		})

		_, _ = q.CreateSavedPlace(ctx, db.CreateSavedPlaceParams{
			TripID:       tokyoTrip.ID,
			Title:        "Nezu Museum Garden",
			Category:     "architecture",
			Address:      sql.NullString{String: "6-5-1 Minamiaoyama, Minato-ku", Valid: true},
			Neighborhood: sql.NullString{String: "Aoyama", Valid: true},
			Latitude:     sql.NullFloat64{Float64: 35.6622, Valid: true},
			Longitude:    sql.NullFloat64{Float64: 139.7180, Valid: true},
			Rating:       sql.NullString{String: "4.9", Valid: true},
			Notes:        sql.NullString{String: "Kengo Kuma design, lush bamboo alley, tranquil koi pond", Valid: true},
			ImageUrl:     sql.NullString{String: "/images/nezu-museum.png", Valid: true},
			IsVisited:    true,
		})

		_, _ = q.CreateSavedPlace(ctx, db.CreateSavedPlaceParams{
			TripID:       tokyoTrip.ID,
			Title:        "Tsukiji Outer Market",
			Category:     "dining",
			Address:      sql.NullString{String: "4 Chome Tsukiji, Chuo City", Valid: true},
			Neighborhood: sql.NullString{String: "Tsukiji", Valid: true},
			Latitude:     sql.NullFloat64{Float64: 35.6655, Valid: true},
			Longitude:    sql.NullFloat64{Float64: 139.7708, Valid: true},
			Rating:       sql.NullString{String: "4.7", Valid: true},
			Notes:        sql.NullString{String: "Tamagoyaki omelettes, fresh uni, and knife artisans", Valid: true},
			ImageUrl:     sql.NullString{String: "/images/tsukiji-market.png", Valid: true},
			IsVisited:    false,
		})

		// Seed Documents
		_, _ = q.CreateDocument(ctx, db.CreateDocumentParams{
			TripID:           tokyoTrip.ID,
			Title:            "Flight Confirmation (NH-106)",
			DocType:          "flight",
			FileUrl:          sql.NullString{String: "https://ana.co.jp/records/NH106.pdf", Valid: true},
			ConfirmationCode: sql.NullString{String: "NH-883921", Valid: true},
			Provider:         sql.NullString{String: "All Nippon Airways", Valid: true},
			ValidDate:        sql.NullTime{Time: startDate, Valid: true},
			Notes:            sql.NullString{String: "E-Ticket receipt with seat assignments 14A & 14C", Valid: true},
		})

		_, _ = q.CreateDocument(ctx, db.CreateDocumentParams{
			TripID:           tokyoTrip.ID,
			Title:            "Hotel Voucher - Cerulean Tower",
			DocType:          "hotel",
			FileUrl:          sql.NullString{String: "https://ceruleantower.jp/res/4902.pdf", Valid: true},
			ConfirmationCode: sql.NullString{String: "CT-TOKYO-4902", Valid: true},
			Provider:         sql.NullString{String: "Tokyu Hotels Group", Valid: true},
			ValidDate:        sql.NullTime{Time: startDate, Valid: true},
			Notes:            sql.NullString{String: "Corner King Room with Fuji view on 28th floor", Valid: true},
		})

		log.Println("[Seed] Tokyo Spring 2027 trip & interactive data seeded successfully!")
	}
}
