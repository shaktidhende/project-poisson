# Dental EMR Business Website

A modern website + full-stack EMR demo for a dental clinic product.

## Project structure

```text
dental-emr-site/
├─ app-full.html          # EMR app UI
├─ app-full.js            # EMR frontend logic (API integration)
├─ index.html             # Marketing landing page
├─ styles.css             # Shared styles
├─ server.js              # Server entrypoint
├─ package.json
├─ package-lock.json
├─ .gitignore
└─ src/
   ├─ app.js
   ├─ config/
   │  ├─ constants.js
   │  └─ db.js
   ├─ middleware/
   │  └─ auth.js
   ├─ routes/
   │  ├─ auth.routes.js
   │  └─ emr.routes.js
   └─ services/
      └─ pdf.js
```

## Run locally (full-stack)

```bash
npm install
npm start
```

Then open:
- http://localhost:8080 (landing)
- http://localhost:8080/app-full.html (EMR app)

## Included functionality
- Role-based auth (Admin / Doctor / Reception)
- Patient management
- Appointment booking
- Clinical notes
- Treatment plans
- Prescriptions
- Billing invoices
- PDF invoice download
