# Military Asset Management - Technical Documentation

## 1. Project Overview

**Description:**
Military Asset Management System is a full-stack web application designed to help commanders and logistics personnel manage the movement, assignment, and expenditure of critical assets like vehicles, weapons, and ammunition across multiple bases.
The system ensures transparency and accountability through detailed audit logs, role-based access control, and daily inventory summaries. It streamlines logistics operations while offering a secure, scalable, and user-friendly solution for modern military needs.

**Assumptions:**

* Each user is tied to a role with specific base-level access.
* All inventory operations are atomic and consistent.
* Asset stocks are unique per base.

**Limitations:**

* Real-time collaboration is not currently supported.
* No offline support.

---

## 2. Tech Stack & Architecture

**Frontend:** ReactJS + Tailwind CSS + React Router DOM
**Backend:** Node.js + Express.js
**Database:** MongoDB
**Scheduler:** node-cron (for daily summary)
**Authentication:** JWT (JSON Web Token)

### Why This Stack?

* **React**: Enables fast, responsive UI for managing assets, logs, and inventory in real-time.
* **Express**: Simplifies backend route handling for purchases, assignments, and movement logs.
* **MongoDB**: Flexible schema ideal for storing nested asset logs, tracking operations (purchase, transfer, expenditure), and fast aggregation for dashboards.
* **JWT**: Provides secure, stateless authentication and supports role-based access (admin/user).

### Architecture Overview:

* RESTful API server
* Separate document schemas for each transaction type
* Centralized Inventory collection per base-asset pair
* Daily summary triggered by cron job
* Logs maintained in `MovementLog`

---

## 3. Data Models / Schema

```js
User: { name, email, password, role, baseAssigned }
Asset: { name, category, unit, description }
Base: { name, district, state }
Inventory: { baseId, assetId, quantity, purchased, expended, assigned, transferredOut, transferredIn, lastUpdated }
Purchase: { invoiceNumber, items, baseId, purchaseDate, remarks }
Transfer: { items, fromBase, toBase, transferDate, remarks }
Assignment: { assetId, assignedTo, quantity, date, remarks, status }
Expenditure: { items, baseId, expendedBy, date, remarks }
MovementLog: { date, asset, quantity, actionType, base, performedBy, remarks }
```

---

## 4. RBAC Explanation

### Roles:

* **Admin**: Full access to all modules and bases
* **Logistics Officer**: Can manage purchase and transfer within assigned base
* **Base Commander**: Can assign and expend assets from assigned base only

### Access Control:

* **Backend**: JWT with role-based middleware verification
* **Frontend**: React Router DOM with protected route guards per role

---

## 5. API Logging

Every operation (Purchase, Transfer, Assignment, Expenditure) is logged in the `MovementLog` collection with:

* `actionType`
* `user`
* `remarks`

### Action Types Tracked:

* Purchase
* Transfer
* Assignment
* Expenditure

---

## 6. Setup Instructions

### Backend:

```bash
git clone <backend-repo-url>
npm install
# Add .env with MONGO_URI and JWT_SECRET
npm run dev
```

### Frontend:

```bash
git clone <frontend-repo-url>
npm install --legacy-peer-deps
# Set VITE_API_BASE_URL in .env
npm run dev
```

### MongoDB:

* Collections are auto-created on first use.
* Inventory should be seeded with initial values if needed.

---

## 7. API Endpoints (Sample)

### 🔐 Auth APIs

* POST `/api/auth/signin`
* POST `/api/auth/logout`

### 🡩‍💼 User APIs

* GET `/api/auth/get`
* GET `/api/auth/get/:id`
* POST `/api/auth/create-user`
* PUT `/api/auth/update/:id`
* PATCH `/api/auth/:id/password`
* DELETE `/api/auth/delete/:id`

### 🏗️ Bases APIs

* GET `/api/settings/bases/get`
* GET `/api/settings/bases/get/:id`
* POST `/api/settings/bases/create`
* PUT `/api/settings/bases/update/:id`
* DELETE `/api/settings/bases/delete/:id`

### 📦 Assets APIs

* GET `/api/settings/assets/get`
* GET `/api/settings/assets/get/:id`
* POST `/api/settings/assets/create`
* PUT `/api/settings/assets/update/:id`
* DELETE `/api/settings/assets/delete/:id`

### 🏢 Inventory APIs

* GET `/api/stocks/my`
* GET `/api/stocks`

### 🛒 Purchase APIs

* POST `/api/purchase/create`
* PUT `/api/purchase/update/:id`
* DELETE `/api/purchase/delete/:id`
* GET `/api/purchase/getMy`
* GET `/api/purchase/get/:id`

### 🚚 Transfer APIs

* POST `/api/transfers/create`
* DELETE `/api/transfers/delete/:id`
* GET `/api/transfers/getMy`
* GET `/api/transfers/get/:id`

### 👨‍✈️ Assignment APIs

* POST `/api/assign/create`
* DELETE `/api/assign/delete/:id`
* GET `/api/assign/getMy`
* GET `/api/assign/get/:id`

### 💸 Expenditure APIs

* POST `/api/expend/create`
* POST `/api/expend/markAssignedAsExpended/:id`
* DELETE `/api/expend/delete/:id`
* GET `/api/expend/getMy`
* GET `/api/expend/get/:id`

### 📄 Movement Logs API

* GET `/api/movement`

### 📊 Dashboard Summary API

* GET `/api/summary`

---

## ⌛ Cron Job - Daily Asset Summary

* **Runs daily at midnight** (`0 0 * * *`)
* Tracks and saves per-base daily:

  * Opening Balance
  * Closing Balance
  * Net Movement (Purchase + Transfer In - Transfer Out)

---

> Made with ❤️ by Durai
