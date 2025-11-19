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
              example: "john@example.com",
            },
            phone: {
              type: "string",
              nullable: true,
              example: "+263771234567",
            },
            full_name: {
              type: "string",
              example: "John Doe",
            },
            roles: {
              type: "array",
              items: {
                type: "string",
                enum: ["customer", "agent", "manager", "admin"],
              },
              example: ["customer"],
            },
            status: {
              type: "string",
              enum: ["active", "suspended", "deleted"],
              example: "active",
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
              example: "2023-05-15T10:00:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2023-05-15T10:00:00Z",
            },
          },
          required: ["email", "full_name", "roles", "status"],
        },

        // ---------- PROFILE SUB-SCHEMAS ----------

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
        name: "RatePlans",
        description: "Pricing rate plans for vehicles/branches",
      },
      { name: "PromoCodes", description: "Promo / discount codes" },
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
