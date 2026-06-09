# PixVault

## AI-Powered Event Media Management Platform

PixVault is a smart event media management platform that helps organizers and attendees manage, discover, and share event photos and videos efficiently.

Using cloud storage, facial recognition, media classification, and social engagement features, PixVault eliminates the problem of manually searching through thousands of event photos.

---

## Problem Statement

During large events such as hackathons, college fests, conferences, and cultural programs, attendees struggle to find their own photos among hundreds or thousands of uploaded images.

Traditional galleries provide only basic browsing and lack intelligent discovery mechanisms.

PixVault solves this problem using AI-powered facial recognition and smart media organization.

---

## Key Features

### Authentication & Security

* User Registration
* User Login
* JWT Authentication
* Role-Based Access Control (Admin / Viewer)

### Event Management

* Create Events
* Edit Events
* Delete Events
* Public and Private Events

### Media Management

* Upload Photos
* Upload Videos
* Media Classification (Photos / Videos)
* Secure Cloud Storage using AWS S3

### AI Features

* Facial Recognition using AWS Rekognition
* Find My Photos
* Smart Media Discovery

### Social Features

* Like Media
* Comment on Media
* Add to Favorites
* Notification System

### Sharing & Analytics

* QR Code Sharing
* Album Sharing
* Watermarked Downloads
* Event Analytics Dashboard

---

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* FastAPI
* Python

### Database

* MongoDB

### Cloud Services

* AWS S3
* AWS Rekognition

### Authentication

* JWT (JSON Web Tokens)

---

## System Architecture

```text
User
  │
  ▼
Next.js Frontend
  │
  ▼
FastAPI Backend
  │
  ├── MongoDB
  ├── AWS S3
  └── AWS Rekognition
```

---

## Project Structure

```text
PixVault
│
├── frontend
│   ├── src
│   ├── public
│   └── package.json
│
├── Backend
│   ├── app
│   ├── routers
│   ├── models
│   ├── schemas
│   └── services
│
└── README.md
```

---

## Implemented Features

* Event Creation
* Event Deletion
* Media Upload
* Photo Upload
* Video Upload
* Media Filtering
* Favorites
* Likes
* Comments
* Notifications
* Face Registration
* Find My Photos
* Analytics Dashboard
* QR Sharing
* Watermarked Downloads

---

## Future Scope

* Mobile Application
* AI Video Recognition
* Advanced Analytics
* Event Recommendation Engine
* Multi-Event Management Dashboard

---

## License

MIT License
