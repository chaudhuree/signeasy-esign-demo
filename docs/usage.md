# SignEasy Demo Documentation

## Overview
This application demonstrates integration with SignEasy's API for document signing and management. It provides functionality for uploading documents, sending them for signature, and downloading signed documents.

## Features
- Upload original documents
- Send documents for signature
- Download signed documents

## API Endpoints

### Document Upload
```
POST /api/docs/upload
```
Upload a new document to SignEasy.

**Request:**
- Content-Type: multipart/form-data
- Body: file (PDF document)

**Response:**
```json
{
    "success": true,
    "data": {
        "originalId": "string",
        "name": "string"
    }
}
```

### Add Document
```
POST /api/docs/add-doc
```
Add document details to the system.

**Request:**
```json
{
    "originalId": "string",
    "name": "string"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Document added successfully"
}
```

### Send Envelope
```
POST /api/docs/send-envelope
```
Send a document for signing.

**Request:**
```json
{
    "originalId": "string",
    "recipient": {
        "name": "string",
        "email": "string"
    }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "envelopeId": "string"
    }
}
```

### Get Signed ID
```
POST /api/docs/get-signed-id
```
Retrieve the signed document ID.

**Request:**
```json
{
    "originalId": "string"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "signedId": "string"
    }
}
```

### Download Signed Document
```
GET /api/docs/download/merged/:signed_id
```
Download a signed document.

**Parameters:**
- signed_id: ID of the signed document

**Response:**
- Content-Type: application/pdf
- Binary PDF file

## Web Interface

### Document Download Page
Access the document download interface at `/download`. This page provides a simple interface to:
1. Enter the signed document ID
2. Download the signed document

**Required Information:**
- Signed Document ID

## Error Handling
The API returns appropriate HTTP status codes and error messages:
- 400: Bad Request (missing or invalid parameters)
- 401: Unauthorized (invalid API token)
- 404: Not Found (document not found)
- 500: Internal Server Error

## Environment Variables
Required environment variables:
```
SIGNEASY_ACCESS_TOKEN=your_access_token
DATABASE=your_database_connection_string
PORT=8000 (default)