School Management APIs
This repository contains the source code for a School Management API, built to handle school data, including adding new school records and retrieving existing ones based on location.

The API is built using Node.js and integrates with a PostgreSQL database to store school data. The endpoints are deployed on Railway.com for easy access and testing.

Project Deliverables
This project includes three main components:

Source Code Repository: The complete backend source code for the API is contained within this repository.

API Endpoints: Two primary endpoints have been implemented and deployed.

POST /addSchool: Adds a new school to the database.

GET /listSchools: Retrieves a list of schools sorted by proximity to a given location.

Postman Collection: A Postman collection is available for easy testing and documentation of the API endpoints.

API Endpoints
1. Add School (POST /addSchool)
This endpoint allows you to add a new school to the database.

URL: https://<your-railway-domain>/addSchool

Method: POST

Request Body (JSON):

{
  "name": "Maplewood Elementary",
  "address": "789 Pine St, Anytown, USA",
  "latitude": 40.7128,
  "longitude": -74.0060
}

Successful Response (Status: 201 Created):

{
  "message": "School added successfully!",
  "id": 1
}

2. List Schools (GET /listSchools)
This endpoint retrieves a list of all schools from the database, sorted by their distance from a given latitude and longitude.

URL: https://<your-railway-domain>/listSchools

Method: GET

Query Parameters:

latitude: The user's latitude.

longitude: The user's longitude.

Example Request:
https://<your-railway-domain>/listSchools?latitude=40.7128&longitude=-74.0060

Successful Response (Status: 200 OK):

[
  {
    "id": 1,
    "name": "Maplewood Elementary",
    "address": "789 Pine St, Anytown, USA",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "distance_meters": 150.3
  }
]

Getting Started
To run this project locally, follow these steps:

Clone this repository:
git clone https://github.com/your-username/school-management-api-nodejs.git

Install dependencies:
npm install

Set up your PostgreSQL database and configure the connection string.

Start the server:
node server.js
