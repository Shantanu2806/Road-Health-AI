# 🛣️ Road Health AI — Autonomous Road Damage Assessment & Governance Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00599C.svg?style=flat-square&logo=python&logoColor=white)](https://docs.ultralytics.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C.svg?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Leaflet](https://img.shields.io/badge/Leaflet-GIS_Mapping-199900.svg?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-ACID_Database-003B57.svg?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org)

An end-to-end, deep learning-powered infrastructure management platform engineered for automated road pavement distress detection, quantitative health scoring based on the international **RDD2022** taxonomy, live field camera geo-tagging, interactive GIS mapping, and automated territorial contractor alert dispatch.

---

## 📑 Table of Contents
- [Executive Overview](#-executive-overview)
- [System Architecture](#-system-architecture)
- [Core Features & Innovations](#-core-features--innovations)
- [Pavement Defect Taxonomy](#-pavement-defect-taxonomy)
- [Mathematical Scoring Engine](#-mathematical-scoring-engine)
- [Multi-Tier Role & Governance Model](#-multi-tier-role--governance-model)
- [Territorial Contractor Routing & Alert System](#-territorial-contractor-routing--alert-system)
- [Relational Database Schema](#-relational-database-schema)
- [RESTful API Catalog](#-restful-api-catalog)
- [Quickstart Installation Guide](#-quickstart-installation-guide)
- [Automated Verification & Testing](#-automated-verification--testing)
- [License](#-license)

---

## 🔭 Executive Overview

Traditional municipal pavement monitoring relies on manual visual surveys—a method hindered by inspector subjectivity, delayed repair cycles, paper-based contractor assignment, and complete lack of citizen visibility.

**Road Health AI** resolves these operational bottlenecks through:
1. **Real-Time Computer Vision:** Detects cracks, alligator cracking, and potholes using a high-speed YOLOv8 deep learning vision pipeline.
2. **Transparent Mathematical Scoring:** Translates detected defect counts, structural severity weights, and pixel coverage into an explainable **0–100 Road Health Score**.
3. **Live Camera & Automated IO Tagging:** Captures live pavement photos from mobile/webcam and permanently stamps GPS coordinates, reverse geocoded street addresses, and timestamps directly onto the image canvas.
4. **Hierarchical Territorial Dispatching:** Automatically routes high-severity repair alerts to the exact contractor responsible for that municipal ward or neighborhood.
5. **Interactive GIS Damage Map:** Visualizes municipal road health across geographic zones with color-coded condition pins.

---

## 🏛️ System Architecture

```
                                  USER INTERFACE (React 18 + Vite SPA)
     ┌───────────────────────────┬──────────────────────────┬──────────────────────────┐
     │  Citizen Portal (Upload)  │ Contractor Dashboard     │  Admin Governance Portal │
     │  - Live Camera & IO Tag   │ - Area Repair Queue      │  - Contractor Approvals  │
     │  - Before/After Slider    │ - Service Jurisdiction   │  - Global Audit Trail    │
     │  - GIS Damage Map         │ - Status Tracking        │  - Email Dispatch Logs   │
     └─────────────┬─────────────┴────────────┬─────────────┴────────────┬─────────────┘
                   │                          │                          │
                   ▼                          ▼                          ▼
                                 RESTful API GATEWAY (FastAPI / Uvicorn)
     ┌─────────────────────────────────────────────────────────────────────────────────┐
     │  - JWT Bearer Authentication & PBKDF2 / BCrypt Password Security                │
     │  - Out-of-Domain Asphalt Surface Verification Classifier                        │
     │  - Dual YOLOv8 Deep Learning Inference Engine (Torchvision / Ultralytics)       │
     │  - Deterministic Road Health & Damage Index (DI) Scoring Core                   │
     │  - Reverse Geocoding Service (OpenStreetMap Nominatim Engine)                   │
     │  - 4-Tier Territorial Contractor Matching & TLS SMTP Alert Dispatcher           │
     └─────────────────────────┬───────────────────────────────┬───────────────────────┘
                               │                               │
                               ▼                               ▼
                      RELATIONAL DATABASE            PERSISTENT DISK STORAGE
                    ┌─────────────────────┐       ┌───────────────────────────┐
                    │ SQLite / SQLAlchemy │       │ - Raw Image Uploads       │
                    │ - users             │       │ - Annotated Bounding Box  │
                    │ - analyses          │       │   Visualizations          │
                    │ - email_logs        │       │ - YOLOv8 Neural Weights   │
                    └─────────────────────┘       └───────────────────────────┘
```

---

## 🚀 Core Features & Innovations

### 1. Live Camera Field Capture with "IO Tag" Geo-Stamping
- **WebRTC Camera Stream:** Direct real-time viewfinder in the browser with one-touch toggle between front and rear (`environment`) mobile cameras.
- **Native Device Fallback:** Embedded hardware capture trigger for mobile operating systems with strict browser media permissions.
- **Automated GPS & Address Locking:** Browser geolocation locks high-accuracy latitude and longitude down to 5 decimal places with OpenStreetMap Nominatim reverse geocoding.
- **Permanent Canvas Watermark:** Stamps a high-contrast semi-transparent banner across the bottom 16% of the photo canvas with Road Health AI identification, formatted coordinates, street address, and live timestamp.
- **Cross-Role Availability:** Available to Citizens (field reporting), Contractors (repair verification), and Admins (audits).

### 2. Deep Learning Pavement Distress Detection
- **Dual YOLOv8 Model Architecture:** Single-stage convolutional detection localized by bounding box regression and defect classification trained on the international **RDD2022** benchmark.
- **Out-of-Domain Asphalt Gatekeeper:** Validates image characteristics to guarantee that submitted photos represent genuine asphalt roadways before executing neural inference.
- **Configurable Confidence Threshold:** Dynamic confidence slider (0.15 to 0.60) allowing operators to tune precision vs. recall.

### 3. Interactive Before/After Split Slider
- **Fidelity Comparison:** Dual-handle split slider on the results page allowing inspectors to drag horizontally across the image to inspect raw surface conditions against AI bounding box overlays.
- **Tabbed Visualizer:** Switch between *Before/After Slider*, *Annotated Bounding Boxes*, and *Raw Road Imagery*.

### 4. Interactive GIS Road Damage Map
- **Leaflet & React-Leaflet Integration:** Full-screen interactive map rendering geo-pinned inspection markers across city wards.
- **Color-Coded Status Pins:** Green (*Good*), Yellow (*Fair*), Orange (*Poor*), and Red (*Critical*).
- **Interactive Marker Popups:** Direct link to inspect detailed defect inventories and health score breakdowns.

### 5. Multi-Tier Role-Based Governance (RBAC)
- **Public Users:** Submit road photos, explore their own inspection history, and view the public damage map.
- **Contractors:** Maintain service territory profiles (`service_state`, `service_city`, `service_area`), access prioritized repair queues, and receive regional damage alerts.
- **Administrators:** Global management dashboard, contractor account verification (Approve / Reject / Revoke), inspection audit logs, and real-time SMTP delivery tracking.

### 6. Self-Service Password Reset with OTP Email Verification
- 3-step secure workflow: 6-digit numeric OTP generation &rarr; 10-minute expiry verification &rarr; salted password update with confirmation email.

---

## 🏷️ Pavement Defect Taxonomy

The model detects and isolates four structural defect classes aligned with the international **Road Damage Dataset (RDD2022)**:

| Class Code | Defect Name | Structural Description | Severity Weight ($W_c$) |
| :---: | :--- | :--- | :---: |
| **D00** | Longitudinal Crack | Cracks running parallel to the direction of vehicle travel; early sub-base settlement indicator. | **1.0** |
| **D10** | Transverse Crack | Cracks traversing perpendicular to the roadway centerline; thermal contraction distress. | **1.2** |
| **D20** | Alligator Crack | Interconnected polygonal fatigue cracking resembling reptile scales; structural base failure. | **2.0** |
| **D40** | Pothole | Bowl-shaped structural cavities formed through water infiltration and asphalt displacement. | **2.5** |

---

## 📐 Mathematical Scoring Engine

The platform calculates deterministic, explainable pavement health indices without black-box metrics:

### 1. Damage Index ($DI$)
$$\text{Damage Index} = \sum_{i=1}^{N} W_{c_i} \times \text{Confidence}_i$$
*Where $W_{c_i}$ represents the defect class structural severity weight and $\text{Confidence}_i \in [0, 1]$ represents detection certainty.*

### 2. Surface Distress Coverage Percentage ($\text{Coverage \%}$)
$$\text{Coverage \%} = \min\left(100.0, \frac{\sum_{i=1}^{N} (\text{bbox\_width}_i \times \text{bbox\_height}_i)}{\text{image\_width} \times \text{image\_height}} \times 100\right)$$

### 3. Road Health Score ($0 - 100$)
$$\text{Health Score} = \max\left(0.0, \min\left(100.0, 100.0 - (\text{DI} \times 3.0) - (\text{Coverage \%} \times 1.2)\right)\right)$$

### 4. Categorical Condition Tiers

| Health Score Range | Condition Tier | Severity Rating | Action Required |
| :---: | :---: | :---: | :--- |
| **80.0 – 100.0** | <span style="color:#16a34a; font-weight:bold;">Good</span> | Low | Routine periodic monitoring. |
| **60.0 – 79.9** | <span style="color:#ca8a04; font-weight:bold;">Fair</span> | Medium | Preventive surface sealing scheduled. |
| **30.0 – 59.9** | <span style="color:#ea580c; font-weight:bold;">Poor</span> | High | Priority asphalt milling and patching. |
| **0.0 – 29.9** | <span style="color:#dc2626; font-weight:bold;">Critical</span> | High | Immediate emergency structural intervention. |

---

## 👥 Multi-Tier Role & Governance Model

| Capability | Public User | Approved Contractor | Municipal Administrator |
| :--- | :---: | :---: | :---: |
| Capture via Camera & Geo-Tag | ✅ | ✅ | ✅ |
| Upload & Run Assessment | ✅ | ✅ | ✅ |
| View Own Inspection History | ✅ | ✅ | ✅ |
| View Global Municipal Audits | ❌ | ✅ | ✅ |
| Interactive GIS Damage Map | ✅ | ✅ | ✅ |
| Configure Service Jurisdiction | ❌ | ✅ | ❌ |
| Priority Repair Task Queue | ❌ | ✅ | ✅ |
| Receive Targeted Area Alerts | ❌ | ✅ | ✅ (All areas) |
| On-Demand Contractor Resend | ❌ | ❌ | ✅ |
| Approve / Reject Contractors | ❌ | ❌ | ✅ |
| Audit Email Dispatch Logs | ❌ | ❌ | ✅ |

---

## 📍 Territorial Contractor Routing & Alert System

When an inspection yields actionable damage (Score $\le 60$ or Fair condition with defects), the backend initiates an automated alert dispatch workflow:

```
                      INCOMING ROAD ASSESSMENT WITH DAMAGE
                                        │
                                        ▼
                   [ Step 1: Normalize Location Address ]
               Extract State, City, and Sub-city Area Tokens
                                        │
                                        ▼
             [ Step 2: Match Active Contractors in Database ]
                     Tier 1: Specific Area Match (e.g. Swargate)
                     Tier 2: City Match Fallback (e.g. Pune)
                     Tier 3: State Match Fallback (e.g. Maharashtra)
                     Tier 4: Global Active Contractors
                                        │
                                        ▼
                     [ Step 3: Build Recipient Dispatch List ]
               Area Contractor(s)  +  All Municipal Administrators
                                        │
                                        ▼
                   [ Step 4: Dispatch TLS SMTP HTML Email ]
              Detailed Metrics + Defect Breakdown + Attached Photo
                                        │
                                        ▼
                     [ Step 5: Log to `email_logs` Table ]
```

- **Devanagari Transliteration:** Automatically matches transliterated Marathi/Hindi area names (e.g., *स्वारगेट* &rarr; *Swargate*, *कात्रज* &rarr; *Katraj*).
- **Test Domain Guard:** Simulates delivery for `@test.com` addresses in test suites, preventing Gmail SMTP rate limits and avoiding spamming real inboxes.

---

## 🗄️ Relational Database Schema

The SQLite relational database (`backend/road_health.db`) is structured into three primary tables:

### 1. `users` Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    full_name VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_approved BOOLEAN NOT NULL DEFAULT 1,
    service_state VARCHAR,
    service_city VARCHAR,
    service_area VARCHAR,
    reset_otp_code VARCHAR,
    reset_otp_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `analyses` Table
```sql
CREATE TABLE analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    latitude FLOAT,
    longitude FLOAT,
    location_name VARCHAR,
    original_image_path VARCHAR NOT NULL,
    annotated_image_path VARCHAR NOT NULL,
    detections JSON NOT NULL,
    damage_index FLOAT NOT NULL,
    coverage_pct FLOAT NOT NULL,
    severity VARCHAR NOT NULL,
    road_health_score FLOAT NOT NULL,
    condition_label VARCHAR NOT NULL
);
```

### 3. `email_logs` Table
```sql
CREATE TABLE email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    recipient VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    error_message VARCHAR,
    analysis_id INTEGER REFERENCES analyses(id)
);
```

---

## 🔌 RESTful API Catalog

| Method | Endpoint | Access Level | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/health` | Public | System health check and API version response. |
| `POST` | `/auth/register` | Public | User / contractor registration with role and service area. |
| `POST` | `/auth/login` | Public | Credential verification returning JWT bearer token. |
| `GET` | `/auth/me` | Authenticated | Current user profile and permission details. |
| `POST` | `/auth/forgot-password/request-otp` | Public | Dispatches 6-digit password reset OTP to email. |
| `POST` | `/auth/forgot-password/verify-otp` | Public | Verifies OTP validity within 10-minute window. |
| `POST` | `/auth/forgot-password/reset` | Public | Sets new password and sends confirmation email. |
| `POST` | `/analyze` | Authenticated | Submits road image + GPS coordinates for AI assessment. |
| `GET` | `/history` | Authenticated | Fetches inspection history (role-isolated). |
| `GET` | `/analyses/{id}` | Authenticated | Retrieves detailed single assessment report. |
| `POST` | `/analyses/{id}/resend-alert` | Admin | Manually triggers damage alert dispatch. |
| `GET` | `/map/markers` | Public | Returns geo-pinned inspection coordinates for Leaflet map. |
| `GET` | `/contractor/dashboard-data` | Contractor / Admin | Priority repair queue sorted by urgency. |
| `PUT` | `/contractor/profile` | Contractor | Updates contractor territorial jurisdiction. |
| `GET` | `/admin/stats` | Admin Only | System-wide performance and damage analytics. |
| `GET` | `/admin/contractors` | Admin Only | List of contractors with approval management. |
| `PUT` | `/admin/contractors/{id}/approve` | Admin Only | Approves, rejects, or revokes contractor credentials. |
| `GET` | `/admin/email-logs` | Admin Only | Audits all historical email dispatch transmissions. |

---

## 🛠️ Quickstart Installation Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Shantanu2806/Road-Health-AI.git
cd Road-Health-AI
```

### 2. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your JWT secret and Gmail SMTP credentials if enabling email alerts

# Start the FastAPI server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will be running at [http://127.0.0.1:8000](http://127.0.0.1:8000) with interactive documentation at `/docs`.*

### 3. Frontend Setup
```bash
# Open a new terminal in the project root
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
*Frontend application will be accessible at [http://localhost:5173](http://localhost:5173).*

---

## 🧪 Automated Verification & Testing

The repository includes comprehensive automated test suites covering all architectural layers:

```bash
# Run backend scoring engine unit tests
cd backend
python -m pytest test_scoring.py -v

# Run full system integration tests (Auth, Routing, Email, API)
python test_new_features.py
```

### Frontend Production Validation
```bash
cd frontend
npm run build
```
*Compiles the single-page application into optimized static assets in `dist/` with zero errors.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.
