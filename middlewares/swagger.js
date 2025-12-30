const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Car Rental API",
      version: "1.0.0",
      description:
        "API for managing users, profiles, cars, bookings, and related operations with authentication",
    },
    servers: [
      {
        url: "http://13.61.185.238:5050",
        description: "AWS SERVER",
      },
      {
        url: "http://localhost:5050",
        description: "Local server",
      },
    ],
    components: {
      schemas: {
        // ---------- USER / AUTH ----------

        AuthProvider: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: ["google", "apple", "email"],
              example: "google",
            },
            provider_user_id: {
              type: "string",
              example: "12345678901234567890",
            },
            added_at: {
              type: "string",
              format: "date-time",
              example: "2023-05-15T10:00:00Z",
            },
          },
          required: ["provider", "provider_user_id"],
        },
        PricingLine: {
          type: "object",
          properties: {
            label: { type: "string", example: "Base daily rate" },
            quantity: { type: "number", example: 3 },
            unit_amount: {
              type: "string",
              description: "Decimal as string",
              example: "50.00",
            },
            total: {
              type: "string",
              description: "Decimal as string",
              example: "150.00",
            },
          },
        },

        FeeLine: {
          type: "object",
          properties: {
            code: { type: "string", example: "AIRPORT_FEE" },
            amount: { type: "string", example: "10.00" },
          },
        },

        TaxLine: {
          type: "object",
          properties: {
            code: { type: "string", example: "VAT" },
            rate: { type: "number", example: 0.15 },
            amount: { type: "string", example: "24.00" },
          },
        },

        DiscountLine: {
          type: "object",
          properties: {
            promo_code_id: {
              type: "string",
              example: "6750f1e0c1a2b34de0promo01",
            },
            amount: { type: "string", example: "5.00" },
          },
        },

        Pricing: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              example: "USD",
            },
            breakdown: {
              type: "array",
              items: { $ref: "#/components/schemas/PricingLine" },
            },
            fees: {
              type: "array",
              items: { $ref: "#/components/schemas/FeeLine" },
            },
            taxes: {
              type: "array",
              items: { $ref: "#/components/schemas/TaxLine" },
            },
            discounts: {
              type: "array",
              items: { $ref: "#/components/schemas/DiscountLine" },
            },
            grand_total: {
              type: "string",
              description: "Decimal as string",
              example: "179.00",
            },
            computed_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-05T10:00:00Z",
            },
          },
        },

        PaymentSummary: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["unpaid", "partial", "paid", "refunded", "void"],
              example: "unpaid",
            },
            paid_total: { type: "string", example: "0.00" },
            outstanding: { type: "string", example: "179.00" },
            last_payment_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
          },
        },

        DriverSnapshot: {
          type: "object",
          properties: {
            full_name: { type: "string", example: "John Doe" },
            phone: { type: "string", example: "+263771234567" },
            email: { type: "string", example: "john@example.com" },
            driver_license: {
              type: "object",
              properties: {
                number: { type: "string", example: "DL1234567" },
                country: { type: "string", example: "ZW" },
                class: { type: "string", example: "Class 4" },
                expires_at: {
                  type: "string",
                  format: "date-time",
                  example: "2027-12-31T23:59:59Z",
                },
                verified: { type: "boolean", example: false },
              },
            },
          },
        },

        Endpoint: {
          type: "object",
          properties: {
            branch_id: {
              type: "string",
              description: "Branch _id",
              example: "6750f1e0c1a2b34de0abcd01",
            },
            at: {
              type: "string",
              format: "date-time",
              example: "2025-02-01T10:00:00Z",
            },
          },
        },

        Payment: {
          type: "object",
          description:
            "Payment record. Must reference either reservation_id or driver_booking_id.",
          properties: {
            _id: {
              type: "string",
              example: "6750f1e0c1a2b34de0pay001",
            },

            reservation_id: {
              type: "string",
              nullable: true,
              description: "Reservation ObjectId",
              example: "6750f1e0c1a2b34de0res001",
            },

            driver_booking_id: {
              type: "string",
              nullable: true,
              description: "DriverBooking ObjectId",
              example: "6750f1e0c1a2b34de0drv001",
            },

            user_id: {
              type: "string",
              description: "User ObjectId",
              example: "665a8c7be4f1c23b04d12345",
            },

            provider: {
              type: "string",
              enum: ["stripe", "paynow", "ecocash", "bank_transfer", "cash"],
              example: "paynow",
            },

            method: {
              type: "string",
              enum: ["card", "wallet", "bank", "cash"],
              example: "wallet",
            },

            amount: {
              type: "string",
              description: "Decimal128 value stored as string",
              example: "150.00",
            },

            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              example: "USD",
            },

            paymentStatus: {
              type: "string",
              enum: [
                "paid",
                "pending",
                "failed",
                "unpaid",
                "cancelled",
                "sent",
                "awaiting_delivery",
                "awaiting_confirmation",
              ],
              example: "pending",
            },

            pollUrl: {
              type: "string",
              example: "not available",
            },

            pricePaid: {
              type: "number",
              example: 150,
            },

            promotionApplied: {
              type: "boolean",
              example: false,
            },

            promotionDiscount: {
              type: "number",
              example: 0,
            },

            boughtAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T09:45:00Z",
            },

            provider_ref: {
              type: "string",
              nullable: true,
              example: "PNW-REF-839203",
            },

            captured_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-01-01T09:46:30Z",
            },

            paynow_invoice_id: {
              type: "string",
              nullable: true,
              example: "PNW-INV-20250101-0001",
            },

            refunds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  amount: {
                    type: "string",
                    description: "Decimal128 refund amount",
                    example: "50.00",
                  },
                  provider_ref: {
                    type: "string",
                    example: "PNW-REFUND-001",
                  },
                  at: {
                    type: "string",
                    format: "date-time",
                    example: "2025-01-02T10:00:00Z",
                  },
                },
              },
            },

            promo_code_id: {
              type: "string",
              nullable: true,
              description: "PromoCode ObjectId",
              example: "6750f1e0c1a2b34de0promo01",
            },

            promo_code: {
              type: "string",
              nullable: true,
              description: "Snapshot promo code text",
              example: "WELCOME10",
            },

            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T09:40:00Z",
            },

            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T09:46:45Z",
            },
          },
        },

        Reservation: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6750f1e0c1a2b34de0res001" },
            code: { type: "string", example: "HRE-2025-000123" },
            user_id: {
              type: "string",
              description: "Customer user_id",
              example: "665a8c7be4f1c23b04d12345",
            },
            created_by: {
              type: "string",
              description: "User who created the reservation",
              example: "665a8c7be4f1c23b04d99999",
            },
            created_channel: {
              type: "string",
              enum: ["web", "mobile", "kiosk", "agent"],
              example: "web",
            },
            vehicle_id: {
              type: "string",
              nullable: true,
              description: "Assigned vehicle (may be null until assignment)",
              example: "6750f1e0c1a2b34de0veh001",
            },
            vehicle_model_id: {
              type: "string",
              description: "Vehicle model",
              example: "6750f1e0c1a2b34de0model01",
            },
            pickup: { $ref: "#/components/schemas/Endpoint" },
            dropoff: { $ref: "#/components/schemas/Endpoint" },
            status: {
              type: "string",
              enum: [
                "pending",
                "confirmed",
                "checked_out",
                "returned",
                "cancelled",
                "no_show",
              ],
              example: "pending",
            },
            pricing: { $ref: "#/components/schemas/Pricing" },
            payment_summary: { $ref: "#/components/schemas/PaymentSummary" },
            driver_snapshot: { $ref: "#/components/schemas/DriverSnapshot" },
            notes: {
              type: "string",
              example: "Customer arriving 30 mins early",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T10:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T10:15:00Z",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "665a8c7be4f1c23b04d12345",
            },

            email: {
              type: "string",
              required: true,
              example: "john@example.com",
            },

            phone: {
              type: "string",
              nullable: true,
              example: "+263771234567",
            },

            full_name: {
              type: "string",
              required: true,
              example: "John Doe",
            },

            roles: {
              type: "array",
              items: {
                type: "string",
                enum: ["customer", "agent", "manager", "admin", "driver"],
              },
              example: ["customer"],
            },

            status: {
              type: "string",
              enum: ["pending", "active", "suspended", "deleted"],
              example: "pending",
            },

            email_verified: {
              type: "boolean",
              example: false,
            },

            email_verification_otp: {
              type: "string",
              description:
                "OTP for verifying email (not returned in API responses)",
              example: "123456",
              writeOnly: true,
            },

            email_verification_expires_at: {
              type: "string",
              format: "date-time",
              description: "Expiry time for email verification OTP",
              example: "2025-02-10T08:15:00Z",
              writeOnly: true,
            },

            delete_account_otp: {
              type: "string",
              description:
                "OTP for deleting account (not returned in responses)",
              example: "654321",
              writeOnly: true,
            },

            delete_account_otp_expires_at: {
              type: "string",
              format: "date-time",
              description: "Expiry time for delete-account OTP",
              example: "2025-02-10T08:15:00Z",
              writeOnly: true,
            },

            reset_password_otp: {
              type: "string",
              description:
                "OTP for resetting password (not returned in responses)",
              example: "789012",
              writeOnly: true,
            },

            reset_password_expires_at: {
              type: "string",
              format: "date-time",
              description: "Expiry time for reset-password OTP",
              example: "2025-02-10T08:20:00Z",
              writeOnly: true,
            },

            auth_providers: {
              type: "array",
              items: {
                $ref: "#/components/schemas/AuthProvider",
              },
            },

            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-02-10T08:00:00Z",
            },

            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-02-10T10:15:00Z",
            },
          },

          required: ["email", "full_name", "roles", "status"],
        },

        ServiceOrder: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Service order ID",
              example: "665a8e3d3f1a2c0012abc123",
            },
            vehicle_id: {
              type: "string",
              description: "Reference to the vehicle",
              example: "665a8d123f1a2c0012abf999",
            },
            type: {
              type: "string",
              description: "Type of service job",
              enum: [
                "scheduled_service",
                "repair",
                "tyre_change",
                "inspection",
              ],
              example: "scheduled_service",
            },
            status: {
              type: "string",
              description: "Current status of service order",
              enum: ["open", "in_progress", "completed", "cancelled"],
              example: "open",
            },
            odometer_km: {
              type: "number",
              description: "Odometer reading at time of service (km)",
              example: 45321,
            },
            cost: {
              type: "number",
              description: "Total cost of the service",
              example: 120.5,
            },
            notes: {
              type: "string",
              description: "Additional notes about the service",
              example: "Replaced front brake pads and rotated tyres.",
            },
            created_by: {
              type: "string",
              description: "User who created the service order",
              example: "665a8fd23f1a2c0012abf777",
            },
            performed_by: {
              type: "string",
              description: "User or vendor who performed the service",
              example: "665a8fd23f1a2c0012abf888",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
              example: "2025-01-15T10:23:45.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
              example: "2025-01-16T08:12:01.000Z",
            },
          },
          required: ["vehicle_id", "type", "status"],
        },
        // ---------- PROFILE SUB-SCHEMAS ----------
        IdentityDocument: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["national_id", "passport"],
              example: "national_id",
            },
            imageUrl: {
              type: "string",
              example: "https://example.com/uploads/id-front.jpg",
            },
          },
        },

        DriverLicenseDocument: {
          type: "object",
          properties: {
            number: {
              type: "string",
              example: "DL1234567",
            },
            imageUrl: {
              type: "string",
              example: "https://example.com/uploads/license.jpg",
            },
            country: {
              type: "string",
              example: "ZW",
            },
            class: {
              type: "string",
              example: "Class 4",
            },
            expires_at: {
              type: "string",
              format: "date-time",
              example: "2027-12-31T23:59:59Z",
            },
            verified: {
              type: "boolean",
              example: false,
            },
          },
        },

        DriverProfile: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "67a1234bcde567890fabcd01",
            },
            user_id: {
              type: "string",
              description: "User _id who owns this driver profile",
              example: "665a8c7be4f1c23b04d12345",
            },
            display_name: {
              type: "string",
              example: "John D. - Harare Driver",
            },
            base_city: {
              type: "string",
              example: "Harare",
            },
            base_region: {
              type: "string",
              example: "Harare Province",
            },
            base_country: {
              type: "string",
              example: "Zimbabwe",
            },
            hourly_rate: {
              type: "number",
              example: 15,
              description: "Price per hour in your chosen currency context",
            },
            bio: {
              type: "string",
              example: "Professional driver with 8 years experience in Harare.",
            },
            profile_image: {
              type: "string",
              example: "Professional passport photo URL",
            },
            years_experience: {
              type: "number",
              example: 8,
            },
            languages: {
              type: "array",
              items: { type: "string" },
              example: ["English", "Shona"],
            },
            identity_document: {
              $ref: "#/components/schemas/IdentityDocument",
            },
            driver_license: {
              $ref: "#/components/schemas/DriverLicenseDocument",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              example: "pending",
            },
            approved_by_admin: {
              type: "string",
              nullable: true,
              example: "665a8c7be4f1c23b04dadmin1",
            },
            approved_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-01-15T10:00:00Z",
            },
            rejection_reason: {
              type: "string",
              example: "",
            },
            is_available: {
              type: "boolean",
              example: true,
            },
            rating_average: {
              type: "number",
              example: 4.7,
            },
            rating_count: {
              type: "number",
              example: 23,
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        // Input schema for creating/updating own profile (no status/approval fields)
        DriverProfileInput: {
          type: "object",
          properties: {
            display_name: {
              type: "string",
              example: "John D. - Harare Driver",
            },
            base_city: {
              type: "string",
              example: "Harare",
            },
            base_region: {
              type: "string",
              example: "Harare Province",
            },
            base_country: {
              type: "string",
              example: "Zimbabwe",
            },
            hourly_rate: {
              type: "number",
              example: 15,
            },
            bio: {
              type: "string",
              example: "Professional driver with 8 years experience in Harare.",
            },
            years_experience: {
              type: "number",
              example: 8,
            },
            languages: {
              type: "array",
              items: { type: "string" },
              example: ["English", "Shona"],
            },
            identity_document: {
              $ref: "#/components/schemas/IdentityDocument",
            },
            driver_license: {
              $ref: "#/components/schemas/DriverLicenseDocument",
            },
          },
          required: ["hourly_rate"],
        },

        DriverLicense: {
          type: "object",
          properties: {
            number: {
              type: "string",
              example: "DL1234567",
            },
            imageUrl: {
              type: "string",
              example: "https://example.com/uploads/license.jpg",
            },
            country: {
              type: "string",
              example: "ZW",
            },
            class: {
              type: "string",
              example: "Class 4",
            },
            expires_at: {
              type: "string",
              format: "date-time",
              example: "2027-12-31T23:59:59Z",
            },
            verified: {
              type: "boolean",
              example: false,
            },
          },
        },

        Address: {
          type: "object",
          properties: {
            line1: {
              type: "string",
              example: "123 Borrowdale Road",
            },
            line2: {
              type: "string",
              example: "Apartment 4B",
            },
            city: {
              type: "string",
              example: "Harare",
            },
            region: {
              type: "string",
              example: "Harare Province",
            },
            postal_code: {
              type: "string",
              example: "0000",
            },
            country: {
              type: "string",
              example: "Zimbabwe",
            },
          },
        },

        Preferences: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              example: "USD",
            },
            locale: {
              type: "string",
              example: "en-ZW",
            },
          },
        },

        Gdpr: {
          type: "object",
          properties: {
            marketing_opt_in: {
              type: "boolean",
              example: false,
            },
          },
        },
        // Inside definition.components.schemas = { ... } add these:

        OpeningPeriod: {
          type: "object",
          description:
            "Opening period within a day, using HH:mm 24-hour format",
          properties: {
            open: {
              type: "string",
              pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
              example: "08:00",
              description: "Opening time (HH:mm)",
            },
            close: {
              type: "string",
              pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
              example: "17:30",
              description: "Closing time (HH:mm)",
            },
          },
          required: ["open", "close"],
        },

        OpeningHours: {
          type: "object",
          description:
            "Per-day opening hours, each day is an array of periods (can be empty if closed).",
          properties: {
            mon: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
              example: [{ open: "08:00", close: "17:30" }],
            },
            tue: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
            },
            wed: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
            },
            thu: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
            },
            fri: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
            },
            sat: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
            },
            sun: {
              type: "array",
              items: { $ref: "#/components/schemas/OpeningPeriod" },
            },
          },
        },

        GeoPoint: {
          type: "object",
          description: "GeoJSON Point [lng, lat]",
          properties: {
            type: {
              type: "string",
              enum: ["Point"],
              example: "Point",
            },
            coordinates: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: { type: "number" },
              example: [31.053, -17.829],
              description: "Coordinates as [longitude, latitude]",
            },
          },
          required: ["type", "coordinates"],
        },

        Branch: {
          type: "object",
          description: "Branch / rental location",
          properties: {
            _id: {
              type: "string",
              example: "6750f1e0c1a2b34de0branch01",
            },
            name: {
              type: "string",
              example: "Harare CBD Branch",
            },
            code: {
              type: "string",
              example: "HRE-CBD",
              description: "Unique branch code, uppercase",
            },
            address: {
              // If you already have Address schema, reuse it:
              $ref: "#/components/schemas/Address",
            },
            geo: {
              $ref: "#/components/schemas/GeoPoint",
            },
            opening_hours: {
              $ref: "#/components/schemas/OpeningHours",
            },
            phone: {
              type: "string",
              example: "+263771234567",
            },
            email: {
              type: "string",
              example: "hre-cbd@ecstassea.com",
            },
            imageLoc: {
              type: "string",
              example: "https://cdn.example.com/branches/hre-cbd.jpg",
            },
            active: {
              type: "boolean",
              example: true,
              description: "If false, branch is inactive / hidden",
            },
            fullAddress: {
              type: "string",
              readOnly: true,
              example: "123 Borrowdale Road, Harare, Harare Province, Zimbabwe",
              description: "Virtual, nicely formatted one-line address",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T10:00:00Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-02T12:34:56Z",
            },
          },
          required: ["name", "code", "geo"],
        },

        // ---------- VEHICLE MODEL (CATALOG) ----------

        VehicleModel: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6750f1e0c1a2b34de0999999" },
            make: { type: "string", example: "Toyota" },
            model: { type: "string", example: "Corolla" },
            year: { type: "integer", example: 2018 },
            class: {
              type: "string",
              enum: [
                "economy",
                "compact",
                "midsize",
                "suv",
                "luxury",
                "van",
                "truck",
              ],
              example: "compact",
            },
            transmission: {
              type: "string",
              enum: ["auto", "manual"],
              example: "auto",
            },
            fuel_type: {
              type: "string",
              enum: ["petrol", "diesel", "hybrid", "ev"],
              example: "petrol",
            },
            seats: { type: "integer", example: 5 },
            doors: { type: "integer", example: 4 },
            features: {
              type: "array",
              items: {
                type: "string",
                enum: ["ac", "bluetooth", "gps", "child_seat", "4x4"],
              },
              example: ["ac", "bluetooth"],
            },
            images: {
              type: "array",
              items: { type: "string" },
              example: [
                "https://example.com/images/corolla-front.jpg",
                "https://example.com/images/corolla-side.jpg",
              ],
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2024-01-10T08:00:00Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2024-02-01T08:00:00Z",
            },
          },
        },

        // ---------- BASE PROFILE + DISCRIMINATORS ----------

        Profile: {
          type: "object",
          description:
            "Base profile document. Concrete profile types are CustomerProfile, AgentProfile, ManagerProfile, AdminProfile.",
          properties: {
            _id: {
              type: "string",
              example: "6750f1e0c1a2b34de0123456",
            },
            user: {
              type: "string",
              description: "Reference to User _id",
              example: "665a8c7be4f1c23b04d12345",
            },
            role: {
              type: "string",
              enum: ["customer", "agent", "manager", "admin"],
              example: "customer",
            },
            full_name: {
              type: "string",
              example: "John Doe",
            },
            dob: {
              type: "string",
              format: "date-time",
              example: "1990-05-21T00:00:00Z",
            },
            national_id: {
              type: "string",
              example: "12-3456789Z12",
            },
            driver_license: {
              $ref: "#/components/schemas/DriverLicense",
            },
            address: {
              $ref: "#/components/schemas/Address",
            },
            preferences: {
              $ref: "#/components/schemas/Preferences",
            },
            gdpr: {
              $ref: "#/components/schemas/Gdpr",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-10T08:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2024-02-01T08:00:00Z",
            },
          },
        },
        RatePlan: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "6750f1e0c1a2b34de0rate001",
            },
            branch_id: {
              type: "string",
              nullable: true,
              description: "Branch _id. Null = all branches.",
              example: "6750f1e0c1a2b34de0abcd01",
            },
            vehicle_class: {
              type: "string",
              enum: [
                "economy",
                "compact",
                "midsize",
                "suv",
                "luxury",
                "van",
                "truck",
              ],
              example: "compact",
            },
            vehicle_model_id: {
              type: "string",
              nullable: true,
              example: "6750f1e0c1a2b34de0model01",
            },
            vehicle_id: {
              type: "string",
              nullable: true,
              example: "6750f1e0c1a2b34de0veh001",
            },
            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              example: "USD",
            },
            daily_rate: {
              type: "string",
              example: "50.00",
            },
            weekly_rate: {
              type: "string",
              nullable: true,
              example: "300.00",
            },
            monthly_rate: {
              type: "string",
              nullable: true,
              example: "900.00",
            },
            weekend_rate: {
              type: "string",
              nullable: true,
              example: "140.00",
            },
            seasonal_overrides: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  season: {
                    type: "object",
                    properties: {
                      name: { type: "string", example: "Peak" },
                      start: {
                        type: "string",
                        format: "date-time",
                        example: "2025-12-15T00:00:00Z",
                      },
                      end: {
                        type: "string",
                        format: "date-time",
                        example: "2026-01-05T00:00:00Z",
                      },
                    },
                  },
                  daily_rate: { type: "string", example: "70.00" },
                  weekly_rate: { type: "string", example: "420.00" },
                  monthly_rate: { type: "string", example: "1200.00" },
                  weekend_rate: { type: "string", example: "200.00" },
                },
              },
            },
            taxes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string", example: "VAT" },
                  rate: { type: "number", example: 0.15 },
                },
              },
            },
            fees: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string", example: "AIRPORT_FEE" },
                  amount: { type: "string", example: "10.00" },
                },
              },
            },
            active: {
              type: "boolean",
              example: true,
            },
            valid_from: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T00:00:00Z",
            },
            valid_to: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
            name: {
              type: "string",
              example: "HRE Compact 2025",
            },
            notes: {
              type: "string",
              example: "Includes airport fee by default",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        CustomerProfile: {
          allOf: [
            { $ref: "#/components/schemas/Profile" },
            {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["customer"],
                  example: "customer",
                },
                verified: {
                  type: "boolean",
                  description:
                    "Set by manager/admin when customer profile has been manually reviewed. Does NOT block usage if false.",
                  example: false,
                },
                loyalty_points: {
                  type: "number",
                  example: 120,
                },
              },
            },
          ],
        },

        AgentProfile: {
          allOf: [
            { $ref: "#/components/schemas/Profile" },
            {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["agent"],
                  example: "agent",
                },
                verified: {
                  type: "boolean",
                  description:
                    "Set by manager/admin when agent profile has been verified. Does NOT block usage if false.",
                  example: false,
                },
                branch_id: {
                  type: "string",
                  description: "Branch _id this agent belongs to",
                  example: "6750f1e0c1a2b34de0abcd01",
                },
                can_apply_discounts: {
                  type: "boolean",
                  example: false,
                },
              },
            },
          ],
        },

        ManagerProfile: {
          allOf: [
            { $ref: "#/components/schemas/Profile" },
            {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["manager"],
                  example: "manager",
                },
                branch_ids: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Branch _id",
                  },
                  example: [
                    "6750f1e0c1a2b34de0abcd01",
                    "6750f1e0c1a2b34de0abcd02",
                  ],
                },
                approval_limit_usd: {
                  type: "number",
                  description:
                    "Maximum USD amount the manager can approve for overrides/discounts.",
                  example: 500,
                },
              },
            },
          ],
        },

        AdminProfile: {
          allOf: [
            { $ref: "#/components/schemas/Profile" },
            {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["admin"],
                  example: "admin",
                },
                super_admin: {
                  type: "boolean",
                  description:
                    "If true, this admin has elevated (system-level) permissions.",
                  example: true,
                },
              },
            },
          ],
        },

        // ---------- VEHICLE UNIT (FLEET CARS) ----------

        Metadata: {
          type: "object",
          properties: {
            gps_device_id: {
              type: "string",
              example: "GPS-DEVICE-123",
            },
            notes: {
              type: "string",
              example: "Minor scratch on rear bumper",
            },
            seats: {
              type: "number",
              minimum: 1,
              maximum: 20,
              example: 5,
            },
            doors: {
              type: "number",
              minimum: 2,
              maximum: 6,
              example: 4,
            },
            features: {
              type: "array",
              items: {
                type: "string",
                enum: ["ac", "bluetooth", "gps", "child_seat", "4x4"],
              },
              example: ["ac", "gps"],
            },
          },
        },

        Vehicle: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "6750f1e0c1a2b34de0fffff1",
            },
            vin: {
              type: "string",
              nullable: true,
              example: "VF3ABCDEF12345678",
            },
            plate_number: {
              type: "string",
              example: "ABC1234",
            },
            vehicle_model_id: {
              type: "string",
              description: "Reference to VehicleModel _id",
              example: "6750f1e0c1a2b34de0999999",
            },
            branch_id: {
              type: "string",
              description: "Reference to Branch _id",
              example: "6750f1e0c1a2b34de0abcd01",
            },
            odometer_km: {
              type: "number",
              minimum: 0,
              example: 45000,
            },
            color: {
              type: "string",
              example: "White",
            },
            status: {
              type: "string",
              enum: ["active", "maintenance", "retired"],
              example: "active",
            },
            availability_state: {
              type: "string",
              enum: ["available", "reserved", "out", "blocked"],
              example: "available",
            },
            photos: {
              type: "array",
              items: { type: "string" },
              example: [
                "https://example.com/vehicle1-front.jpg",
                "https://example.com/vehicle1-interior.jpg",
              ],
            },
            last_service_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-01-10T09:00:00Z",
            },
            last_service_odometer_km: {
              type: "number",
              nullable: true,
              example: 52000,
            },
            metadata: {
              $ref: "#/components/schemas/Metadata",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T10:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-15T15:30:00Z",
            },
          },
        },

        // ---------- PRODUCT (optional, as before) ----------

        Product: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Running Shoes",
            },
            category: {
              type: "string",
              enum: [
                "Clothing",
                "Supplements",
                "Footwear",
                "Equipment",
                "Accessories",
                "Nutrition",
                "Other",
              ],
              example: "Footwear",
            },
            description: {
              type: "string",
              example: "High-performance running shoes for marathon",
            },
            images: {
              type: "array",
              items: {
                type: "string",
              },
              example: [
                "https://example.com/shoe1.jpg",
                "https://example.com/shoe2.jpg",
              ],
            },
            price: {
              type: "number",
              example: 89.99,
            },
            regularPrice: {
              type: "number",
              example: 99.99,
            },
            stockQuantity: {
              type: "number",
              example: 50,
            },
            brand: {
              type: "string",
              example: "RunFast",
            },
            sizeOptions: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["US 8", "US 9", "US 10"],
            },
            colorOptions: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["Black", "Blue", "Red"],
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["running", "lightweight", "cushioned"],
            },
            rating: {
              type: "number",
              example: 4.5,
            },
            isFeatured: {
              type: "boolean",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2023-05-15T10:00:00Z",
            },
          },
          required: ["name", "category", "price", "stockQuantity"],
        },

        PromoConstraints: {
          type: "object",
          properties: {
            allowed_classes: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "economy",
                  "compact",
                  "midsize",
                  "suv",
                  "luxury",
                  "van",
                  "truck",
                ],
              },
              example: ["economy", "compact"],
            },
            min_days: {
              type: "number",
              description: "Minimum rental days required for the promo",
              example: 3,
            },
            branch_ids: {
              type: "array",
              items: {
                type: "string",
                description: "Branch _id where promo is allowed",
              },
              example: ["6750f1e0c1a2b34de0branch01"],
            },
          },
        },

        Location: {
          type: "object",
          properties: {
            label: {
              type: "string",
              example: "Home",
            },
            address: {
              type: "string",
              example: "123 Borrowdale Road, Harare",
            },
            latitude: {
              type: "number",
              example: -17.8292,
            },
            longitude: {
              type: "number",
              example: 31.053,
            },
          },
        },

        DriverPricingSnapshot: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              example: "USD",
            },
            hourly_rate_snapshot: {
              type: "number",
              example: 15,
            },
            hours_requested: {
              type: "number",
              example: 3,
            },
            estimated_total_amount: {
              type: "number",
              example: 45,
            },
          },
        },

        DriverBooking: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "67a12b3c4d5e6f7890abcd01",
            },
            code: {
              type: "string",
              example: "DRV-20251120-123456",
            },
            customer_id: {
              type: "string",
              example: "665a8c7be4f1c23b04d12345",
            },
            created_by: {
              type: "string",
              example: "665a8c7be4f1c23b04d12345",
            },
            created_channel: {
              type: "string",
              enum: ["web", "mobile", "agent", "other"],
              example: "web",
            },
            driver_profile_id: {
              type: "string",
              example: "67a1driverprofileid",
            },
            driver_user_id: {
              type: "string",
              example: "665a8c7be4f1c23b04d99999",
            },
            start_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-21T09:00:00Z",
            },
            end_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-21T12:00:00Z",
            },
            pickup_location: {
              $ref: "#/components/schemas/Location",
            },
            dropoff_location: {
              $ref: "#/components/schemas/Location",
            },
            notes: {
              type: "string",
              example: "Airport pickup, 3 hours, 2 passengers.",
            },
            pricing: {
              $ref: "#/components/schemas/DriverPricingSnapshot",
            },
            status: {
              type: "string",
              enum: [
                "requested",
                "accepted_by_driver",
                "declined_by_driver",
                "awaiting_payment",
                "confirmed",
                "cancelled_by_customer",
                "cancelled_by_driver",
                "expired",
                "completed",
              ],
              example: "requested",
            },
            requested_at: {
              type: "string",
              format: "date-time",
            },
            driver_responded_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            payment_deadline_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            paid_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            cancelled_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            completed_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            payment_id: {
              type: "string",
              nullable: true,
            },
            payment_status_snapshot: {
              type: "string",
              enum: ["unpaid", "pending", "paid", "failed", "refunded", "void"],
              example: "unpaid",
            },
            last_status_update_by: {
              type: "string",
              nullable: true,
            },
            customer_rating_of_driver: {
              type: "number",
              nullable: true,
              example: 5,
            },
            customer_review_text: {
              type: "string",
              example: "Great driver, very professional!",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        DriverBookingCreateRequest: {
          type: "object",
          properties: {
            customer_id: {
              type: "string",
              description:
                "Optional. Only used by agent/manager/admin to create on behalf of a customer.",
              example: "665a8c7be4f1c23b04d12345",
            },
            driver_profile_id: {
              type: "string",
              example: "67a1driverprofileid",
            },
            start_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-21T09:00:00Z",
            },
            end_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            pickup_location: {
              $ref: "#/components/schemas/Location",
            },
            dropoff_location: {
              $ref: "#/components/schemas/Location",
            },
            notes: {
              type: "string",
              example: "Need pickup from airport, 3 hours total.",
            },
            pricing: {
              type: "object",
              properties: {
                currency: {
                  type: "string",
                  enum: ["USD", "ZWL"],
                  example: "USD",
                },
                hours_requested: {
                  type: "number",
                  example: 3,
                },
              },
            },
          },
          required: [
            "driver_profile_id",
            "start_at",
            "pickup_location",
            "dropoff_location",
            "pricing",
          ],
        },

        DriverBookingPaymentAttach: {
          type: "object",
          properties: {
            payment_id: {
              type: "string",
              example: "67a1paymentid",
            },
            payment_status: {
              type: "string",
              enum: ["paid", "pending", "failed"],
              example: "paid",
            },
          },
          required: ["payment_id"],
        },

        Location: {
          type: "object",
          properties: {
            label: {
              type: "string",
              example: "Home",
            },
            address: {
              type: "string",
              example: "123 Borrowdale Road, Harare",
            },
            latitude: {
              type: "number",
              example: -17.8292,
            },
            longitude: {
              type: "number",
              example: 31.053,
            },
          },
        },

        DriverPricingSnapshot: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              example: "USD",
            },
            hourly_rate_snapshot: {
              type: "number",
              example: 15,
            },
            hours_requested: {
              type: "number",
              example: 3,
            },
            estimated_total_amount: {
              type: "number",
              example: 45,
            },
          },
        },

        DriverBooking: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "67a12b3c4d5e6f7890abcd01",
            },
            code: {
              type: "string",
              example: "DRV-20251120-123456",
            },
            customer_id: {
              type: "string",
              example: "665a8c7be4f1c23b04d12345",
            },
            created_by: {
              type: "string",
              example: "665a8c7be4f1c23b04d12345",
            },
            created_channel: {
              type: "string",
              enum: ["web", "mobile", "agent", "other"],
              example: "web",
            },
            driver_profile_id: {
              type: "string",
              example: "67a1driverprofileid",
            },
            driver_user_id: {
              type: "string",
              example: "665a8c7be4f1c23b04d99999",
            },
            start_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-21T09:00:00Z",
            },
            end_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-21T12:00:00Z",
            },
            pickup_location: {
              $ref: "#/components/schemas/Location",
            },
            dropoff_location: {
              $ref: "#/components/schemas/Location",
            },
            notes: {
              type: "string",
              example: "Airport pickup, 3 hours, 2 passengers.",
            },
            pricing: {
              $ref: "#/components/schemas/DriverPricingSnapshot",
            },
            status: {
              type: "string",
              enum: [
                "requested",
                "accepted_by_driver",
                "declined_by_driver",
                "awaiting_payment",
                "confirmed",
                "cancelled_by_customer",
                "cancelled_by_driver",
                "expired",
                "completed",
              ],
              example: "requested",
            },
            requested_at: {
              type: "string",
              format: "date-time",
            },
            driver_responded_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            payment_deadline_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            paid_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            cancelled_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            completed_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            payment_id: {
              type: "string",
              nullable: true,
            },
            payment_status_snapshot: {
              type: "string",
              enum: ["unpaid", "pending", "paid", "failed", "refunded", "void"],
              example: "unpaid",
            },
            last_status_update_by: {
              type: "string",
              nullable: true,
            },
            customer_rating_of_driver: {
              type: "number",
              nullable: true,
              example: 5,
            },
            customer_review_text: {
              type: "string",
              example: "Great driver, very professional!",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        DriverBookingCreateRequest: {
          type: "object",
          properties: {
            customer_id: {
              type: "string",
              description:
                "Optional. Only used by agent/manager/admin to create on behalf of a customer.",
              example: "665a8c7be4f1c23b04d12345",
            },
            driver_profile_id: {
              type: "string",
              example: "67a1driverprofileid",
            },
            start_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-21T09:00:00Z",
            },
            end_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            pickup_location: {
              $ref: "#/components/schemas/Location",
            },
            dropoff_location: {
              $ref: "#/components/schemas/Location",
            },
            notes: {
              type: "string",
              example: "Need pickup from airport, 3 hours total.",
            },
            pricing: {
              type: "object",
              properties: {
                currency: {
                  type: "string",
                  enum: ["USD", "ZWL"],
                  example: "USD",
                },
                hours_requested: {
                  type: "number",
                  example: 3,
                },
              },
            },
          },
          required: [
            "driver_profile_id",
            "start_at",
            "pickup_location",
            "dropoff_location",
            "pricing",
          ],
        },

        DriverBookingPaymentAttach: {
          type: "object",
          properties: {
            payment_id: {
              type: "string",
              example: "67a1paymentid",
            },
            payment_status: {
              type: "string",
              enum: ["paid", "pending", "failed"],
              example: "paid",
            },
          },
          required: ["payment_id"],
        },
        ServiceSchedule: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Service schedule ID",
              example: "665a8e3d3f1a2c0012abc123",
            },
            vehicle_id: {
              type: "string",
              nullable: true,
              description:
                "Specific vehicle this schedule applies to (optional)",
              example: "665a8d123f1a2c0012abf999",
            },
            vehicle_model_id: {
              type: "string",
              nullable: true,
              description: "Vehicle model this schedule applies to (optional)",
              example: "665a8d123f1a2c0012abf111",
            },
            interval_km: {
              type: "number",
              nullable: true,
              description: "Service interval in kilometers",
              example: 10000,
            },
            interval_days: {
              type: "number",
              nullable: true,
              description: "Service interval in days",
              example: 180,
            },
            next_due_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Next due date for this schedule",
              example: "2025-06-01T00:00:00.000Z",
            },
            next_due_odo: {
              type: "number",
              nullable: true,
              description: "Next due odometer value (km)",
              example: 45000,
            },
            notes: {
              type: "string",
              nullable: true,
              description: "Additional information about the schedule",
              example: "Standard 10k km service schedule.",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
              example: "2025-01-15T10:23:45.000Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
              example: "2025-01-20T09:12:00.000Z",
            },
          },
          // At least one of vehicle_id or vehicle_model_id must be set in your logic,
          // but Swagger can't express that exactly; we just mark both as optional here.
        },
        // In swagger.js, inside components.schemas: { ... }

        ChatAttachment: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["image", "file"],
              example: "image",
            },
            url: {
              type: "string",
              description: "Public URL to the uploaded file/image",
              example: "https://cdn.example.com/uploads/chat/abc123.jpg",
            },
            filename: {
              type: "string",
              example: "receipt.jpg",
            },
          },
        },

        ChatMessage: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "67a12b3c4d5e6f7890abcd01",
            },
            conversation_id: {
              type: "string",
              description: "Reference to ChatConversation._id",
              example: "67a12b3c4d5e6f7890conv01",
            },
            sender_id: {
              type: "string",
              description: "User who sent the message (User._id)",
              example: "665a8c7be4f1c23b04d12345",
            },
            content: {
              type: "string",
              description:
                "Text content of the message (can be empty if only attachments)",
              example: "Hi, when can I pick up the vehicle?",
            },
            attachments: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ChatAttachment",
              },
            },
            message_type: {
              type: "string",
              enum: ["user", "system"],
              example: "user",
            },
            read_by: {
              type: "array",
              description: "User IDs that have read this message",
              items: {
                type: "string",
                example: "665a8c7be4f1c23b04d12345",
              },
            },
            is_deleted: {
              type: "boolean",
              example: false,
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-22T10:15:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-22T10:15:10Z",
            },
          },
        },

        ChatMessageCreateRequest: {
          type: "object",
          properties: {
            conversation_id: {
              type: "string",
              description: "Target conversation ID",
              example: "67a12b3c4d5e6f7890conv01",
            },
            content: {
              type: "string",
              description:
                "Text of the message. Can be empty if you only send attachments.",
              example: "Hello, I have a question about my booking.",
            },
            attachments: {
              type: "array",
              description: "Optional list of attachments (images/files)",
              items: {
                $ref: "#/components/schemas/ChatAttachment",
              },
            },
          },
          required: ["conversation_id"],
        },

        ChatParticipant: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "User._id of the participant",
              example: "665a8c7be4f1c23b04d12345",
            },
            role_at_time: {
              type: "string",
              enum: ["customer", "agent", "manager", "admin", "driver"],
              example: "agent",
            },
            joined_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-22T09:00:00Z",
            },
          },
        },

        ChatConversation: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "67a12b3c4d5e6f7890conv01",
            },
            title: {
              type: "string",
              description:
                "Optional title, used mainly for group/support chats",
              example: "Support - Reservation HRE-2025-000123",
            },
            participants: {
              type: "array",
              description: "List of participants in the conversation",
              items: {
                $ref: "#/components/schemas/ChatParticipant",
              },
            },
            type: {
              type: "string",
              enum: ["direct", "group"],
              example: "direct",
            },
            context_type: {
              type: "string",
              enum: [
                "general",
                "reservation",
                "driver_booking",
                "support",
                "other",
              ],
              example: "reservation",
            },
            context_id: {
              type: "string",
              nullable: true,
              description: "Optional ID of linked entity, e.g. Reservation._id",
              example: "67a12b3c4d5e6f7890res123",
            },
            created_by: {
              type: "string",
              description: "User who created this conversation",
              example: "665a8c7be4f1c23b04d12345",
            },
            last_message_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-11-22T10:15:00Z",
            },
            last_message_preview: {
              type: "string",
              example: "Sure, you can collect it at 9AM.",
            },
            is_archived: {
              type: "boolean",
              example: false,
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-22T09:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-22T10:15:00Z",
            },
          },
        },

        ChatConversationCreateRequest: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Optional title for group/support conversations",
              example: "Support - Damaged Tyre",
            },
            participant_ids: {
              type: "array",
              description:
                "User IDs that should participate in this conversation (including the current user if you want)",
              items: {
                type: "string",
                example: "665a8c7be4f1c23b04d12345",
              },
            },
            type: {
              type: "string",
              enum: ["direct", "group"],
              example: "direct",
            },
            context_type: {
              type: "string",
              enum: [
                "general",
                "reservation",
                "driver_booking",
                "support",
                "other",
              ],
              example: "reservation",
            },
            context_id: {
              type: "string",
              nullable: true,
              example: "67a12b3c4d5e6f7890res123",
            },
          },
          required: ["participant_ids"],
        },

        VehicleTrackerCreateRequest: {
          type: "object",
          properties: {
            device_id: {
              type: "string",
              example: "TRACKER-001",
            },
            label: {
              type: "string",
              example: "HRE Tracker Corolla 1",
            },
            notes: {
              type: "string",
              example: "Installed 2025-11-20 by Prince.",
            },
          },
          required: ["device_id"],
        },

        VehicleTrackerAttachRequest: {
          type: "object",
          properties: {
            vehicle_id: {
              type: "string",
              example: "674ad9f1e2b3c4d5e6f78901",
            },
          },
          required: ["vehicle_id"],
        },

        VehicleTrackerDeviceLoginRequest: {
          type: "object",
          properties: {
            device_id: {
              type: "string",
              example: "TRACKER-001",
            },
            api_key: {
              type: "string",
              example: "secret-or-pin",
            },
          },
          required: ["device_id", "api_key"],
        },

        VehicleLocationResponse: {
          type: "object",
          properties: {
            vehicle_id: {
              type: "string",
              example: "674ad9f1e2b3c4d5e6f78901",
            },
            tracker_id: {
              type: "string",
              nullable: true,
              example: "67a1234b5c6d7e8f90123456",
            },
            last_location: {
              $ref: "#/components/schemas/VehicleLocationSnapshot",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-11-23T12:01:05Z",
            },
          },
        },

        VehicleTracker: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "67a1234b5c6d7e8f90123456",
            },
            device_id: {
              type: "string",
              example: "TRACKER-001",
            },
            label: {
              type: "string",
              example: "HRE Tracker Corolla 1",
            },
            vehicle_id: {
              type: "string",
              nullable: true,
              example: "674ad9f1e2b3c4d5e6f78901",
            },
            branch_id: {
              type: "string",
              nullable: true,
              example: "6730b1c2d3e4f5a6b7c89012",
            },
            status: {
              type: "string",
              enum: ["inactive", "active", "maintenance"],
              example: "active",
            },
            last_seen_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-11-23T12:01:05Z",
            },
            last_seen_ip: {
              type: "string",
              example: "197.221.10.45",
            },
            last_seen_user_agent: {
              type: "string",
              example: "Android Tracker App/1.0.0",
            },
            last_location: {
              $ref: "#/components/schemas/VehicleLocationSnapshot",
            },
            settings: {
              type: "object",
              properties: {
                reporting_interval_sec: {
                  type: "integer",
                  example: 15,
                },
                allow_background_tracking: {
                  type: "boolean",
                  example: true,
                },
              },
            },
            created_by: {
              type: "string",
              nullable: true,
              example: "665a8c7be4f1c23b04d12345",
            },
            attached_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-11-23T11:55:00Z",
            },
            detached_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            detach_reason: {
              type: "string",
              example: "Vehicle in workshop",
            },
            notes: {
              type: "string",
              example: "Installed under dashboard.",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        VehicleLocationSnapshot: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              example: -17.8292,
            },
            longitude: {
              type: "number",
              example: 31.053,
            },
            speed_kmh: {
              type: "number",
              example: 48.5,
            },
            heading_deg: {
              type: "number",
              example: 120,
            },
            accuracy_m: {
              type: "number",
              example: 5,
            },
            at: {
              type: "string",
              format: "date-time",
              example: "2025-11-23T12:01:00Z",
            },
            source: {
              type: "string",
              enum: ["gps", "network", "mixed", "unknown"],
              example: "gps",
            },
          },
        },

        VehicleIncident: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Vehicle incident ID",
              example: "67b0f8cbd1e0d201a4e88c91",
            },

            vehicle_id: {
              type: "string",
              description: "ID of the vehicle involved in the incident",
              example: "67b0f7bcd1e0d201a4e88b22",
            },

            reservation_id: {
              type: "string",
              nullable: true,
              description:
                "Reservation during which the incident occurred (optional)",
              example: "67b0f7f4d1e0d201a4e88b70",
            },

            reported_by: {
              type: "string",
              description: "User who reported the incident",
              example: "67a4d90d8f2e7b00128b0fa3",
            },

            branch_id: {
              type: "string",
              nullable: true,
              description: "Branch that logged the incident",
              example: "67a45098c9f71f0021b43c44",
            },

            type: {
              type: "string",
              enum: [
                "accident",
                "scratch",
                "tyre",
                "windshield",
                "mechanical_issue",
                "other",
              ],
              description: "Type of damage or incident",
              example: "accident",
            },

            severity: {
              type: "string",
              enum: ["minor", "major"],
              description: "Incident severity",
              example: "minor",
            },

            photos: {
              type: "array",
              description: "List of photo URLs documenting the damage",
              items: { type: "string" },
              example: [
                "https://cdn.example.com/incidents/123/photo1.jpg",
                "https://cdn.example.com/incidents/123/photo2.jpg",
              ],
            },

            description: {
              type: "string",
              description: "Description of the incident",
              example: "Front bumper cracked and left fog-light damaged.",
            },

            occurred_at: {
              type: "string",
              format: "date-time",
              description: "Date and time when the incident occurred",
              example: "2025-01-12T14:05:00.000Z",
            },

            estimated_cost: {
              type: "number",
              nullable: true,
              description: "Estimated financial cost of the damage",
              example: 350.75,
            },

            final_cost: {
              type: "number",
              nullable: true,
              description: "Final confirmed repair cost",
              example: 310.0,
            },

            status: {
              type: "string",
              enum: ["open", "under_review", "resolved", "written_off"],
              description: "Incident case status",
              example: "open",
            },

            chargeable_to_customer_amount: {
              type: "number",
              nullable: true,
              description:
                "Amount billed to customer for the damage (optional)",
              example: 150.0,
            },

            payment_id: {
              type: "string",
              nullable: true,
              description: "Payment record associated with the damage charge",
              example: "67b0f9cbd1e0d201a4e88fa2",
            },

            created_at: {
              type: "string",
              format: "date-time",
              description: "Record creation timestamp",
              example: "2025-01-12T16:23:44.000Z",
            },

            updated_at: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
              example: "2025-01-12T17:10:02.000Z",
            },
          },

          required: ["vehicle_id", "reported_by", "type", "severity"],
        },
        PromoCode: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "6750f1e0c1a2b34de0promo01",
            },
            code: {
              type: "string",
              example: "WELCOME10",
              description: "Unique promo code (stored uppercase)",
            },
            type: {
              type: "string",
              enum: ["percent", "fixed"],
              example: "percent",
              description:
                "percent = value is percentage (0–100); fixed = currency amount",
            },
            value: {
              type: "number",
              example: 10,
              description:
                "Percentage (0–100) or fixed amount depending on type",
            },
            currency: {
              type: "string",
              enum: ["USD", "ZWL"],
              nullable: true,
              example: "USD",
              description:
                "Required when type=fixed; ignored for percent promos",
            },
            active: {
              type: "boolean",
              example: true,
            },
            valid_from: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T00:00:00Z",
            },
            valid_to: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-03-31T23:59:59Z",
            },
            usage_limit: {
              type: "number",
              nullable: true,
              example: 100,
              description: "Maximum number of uses. Null = unlimited.",
            },
            used_count: {
              type: "number",
              example: 5,
              description: "How many times this promo has been used.",
            },
            constraints: {
              $ref: "#/components/schemas/PromoConstraints",
            },
            notes: {
              type: "string",
              example: "New customers only; not valid on luxury class.",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: ["code", "type", "value", "valid_from"],
        },

        Notification: {
          type: "object",
          description:
            "Notifications for users (in-app/email/sms/push) with audience targeting, scheduling, acknowledgements, and optional CTA.",
          properties: {
            _id: { type: "string", example: "6750f1e0c1a2b34de0not001" },

            title: {
              type: "string",
              maxLength: 160,
              example: "Payment received",
            },

            message: {
              type: "string",
              maxLength: 4000,
              example: "Your payment of USD 150.00 was received successfully.",
            },

            type: {
              type: "string",
              enum: [
                "info",
                "system",
                "promo",
                "booking",
                "payment",
                "maintenance",
                "alert",
              ],
              example: "payment",
            },

            priority: {
              type: "string",
              enum: ["low", "normal", "high", "critical"],
              example: "normal",
            },

            audience: {
              type: "object",
              description: "Defines who should receive the notification.",
              properties: {
                scope: {
                  type: "string",
                  enum: ["all", "user", "roles"],
                  example: "all",
                },
                user_id: {
                  type: "string",
                  nullable: true,
                  description: "Required when scope === 'user'",
                  example: "665a8c7be4f1c23b04d12345",
                },
                roles: {
                  type: "array",
                  nullable: true,
                  description: "Required (non-empty) when scope === 'roles'",
                  items: {
                    type: "string",
                    enum: ["customer", "agent", "manager", "admin", "driver"],
                  },
                  example: ["customer"],
                },
              },
            },

            channels: {
              type: "array",
              description: "Dispatch channels (must be non-empty).",
              items: {
                type: "string",
                enum: ["in_app", "email", "sms", "push"],
              },
              example: ["in_app"],
            },

            send_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "When to start dispatch (scheduled time).",
              example: "2025-01-01T10:00:00Z",
            },

            sent_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2025-01-01T10:00:05Z",
            },

            expires_at: {
              type: "string",
              format: "date-time",
              nullable: true,
              description:
                "Optional expiry (TTL index removes after this time).",
              example: "2025-02-01T00:00:00Z",
            },

            status: {
              type: "string",
              enum: ["draft", "scheduled", "sent", "cancelled"],
              example: "draft",
            },

            is_active: {
              type: "boolean",
              example: true,
            },

            action_text: {
              type: "string",
              nullable: true,
              example: "View receipt",
            },

            action_url: {
              type: "string",
              nullable: true,
              example: "https://example.com/payments/6750f1e0c1a2b34de0pay001",
            },

            data: {
              type: "object",
              description: "Arbitrary non-sensitive payload.",
              example: {
                reservation_id: "6750f1e0c1a2b34de0res001",
                amount: "150.00",
              },
            },

            acknowledgements: {
              type: "array",
              description:
                "Read/acted receipts for users who have interacted with the notification.",
              items: {
                type: "object",
                properties: {
                  user_id: {
                    type: "string",
                    example: "665a8c7be4f1c23b04d12345",
                  },
                  read_at: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                    example: "2025-01-01T10:01:00Z",
                  },
                  acted_at: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                    example: "2025-01-01T10:02:00Z",
                  },
                  action: {
                    type: "string",
                    nullable: true,
                    description:
                      "Optional custom action label (e.g. clicked CTA).",
                    example: "clicked_receipt",
                  },
                },
              },
              example: [
                {
                  user_id: "665a8c7be4f1c23b04d12345",
                  read_at: "2025-01-01T10:01:00Z",
                  acted_at: "2025-01-01T10:02:00Z",
                  action: "clicked_receipt",
                },
              ],
            },

            created_by: {
              type: "string",
              nullable: true,
              description: "User ObjectId (creator/admin/agent).",
              example: "665a8c7be4f1c23b04d99999",
            },

            created_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T09:55:00Z",
            },

            updated_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T10:00:10Z",
            },
          },
        },

        // ---------- ERROR ----------

        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Error message",
            },
            error: {
              type: "string",
              example: "Detailed error description",
            },
          },
        },
      },

      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],

    tags: [
      {
        name: "Users",
        description: "Operations related to users",
      },
      {
        name: "Profiles",
        description:
          "Operations related to user profiles (customer/agent/manager/admin)",
      },
      {
        name: "VehicleModels",
        description: "Vehicle model catalog operations",
      },
      {
        name: "Vehicles",
        description: "Actual vehicle units in branches (fleet)",
      },
      {
        name: "Reservations",
        description: "Car rental reservations / bookings",
      },
      {
        name: "Payments",
        description:
          "Payment transactions for reservations and driver bookings",
      },

      {
        name: "RatePlans",
        description: "Pricing rate plans for vehicles/branches",
      },
      { name: "PromoCodes", description: "Promo / discount codes" },
      {
        name: "DriverProfiles",
        description: "Driver registration, approval and public listing",
      },
      {
        name: "DriverBookings",
        description:
          "Standalone driver booking flows (customer selects a driver and pays after driver accepts).",
      },
      {
        name: "Notifications",
        description:
          "User notifications for system events, bookings, payments, and alerts",
      },
    ],
  },
  apis: [
    "./routers/user_router.js", // adjust path if needed
    "./routers/profile_router.js",
    "./routers/vehicle_router.js", // vehicle models
    "./routers/vehicle_unit_router.js", // vehicle units
    "./routers/reservations_router.js",
    "./routers/rate_plan_router.js",
    "./routers/branch_router.js",
    "./routers/promo_code_router.js",
    "./routers/driver_profile_router.js",
    "./routers/driver_booking_router.js",
    "./routers/service_order_router.js",
    "./routers/service_schedule_router.js",
    "./routers/vehicle_incident_router.js",
    "./routers/chat_router.js",
    "./routers/vehicle_tracker_router.js",
    "./routers/payment_router.js",
    "./routers/notifications_router.js",
    "./routers/dashboard_router.js",
  ],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      swaggerOptions: {
        validatorUrl: null,
        persistAuthorization: true,
      },
    })
  );
};
