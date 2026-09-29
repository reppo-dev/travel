"use client";

import React from "react";
import { Trip } from "@/lib/api";
import { NewTripModal } from "./NewTripModal";

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onUpdated: (updatedTrip: Trip) => void;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  isOpen,
  onClose,
  trip,
  onUpdated,
}) => {
  if (!trip) return null;

  return (
    <NewTripModal
      isOpen={isOpen}
      onClose={onClose}
      tripToEdit={trip}
      onUpdated={onUpdated}
    />
  );
};

export default EditTripModal;
