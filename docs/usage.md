# SignEasy Demo Documentation

## Overview
This application demonstrates integration with SignEasy's API for document signing and management. It provides functionality for uploading documents, sending them for signature, and downloading signed documents.

## Features
- Upload original documents
- Send documents for signature
- Download signed documents

## API workflow
- first it has to call the api add-doc. this is for adding a document in the database. it has nothing to do with signeasy.
- like giving a payement value and some king of id such that invoice id or order id
- with this data , add-doc will create a document in the database.
---
- then in next we will upload the document.
- this will have in body, x,y,file and mongodb schema id in which the add-doc stored the document.
- after uploading it will give a orginalId , and it will be stored in the previously creaded doc's model. just after upload is done it will return the id. then with the schema id
- which we have sent through the body , will use it to update the doc with the original id.

---
- then we will do another api cal to send envelope.```/send-envelope```
- this will return a pending id and a url
- we will send this url by email or directly.

- user will sign this document and confirm this to the client.

---

- then if user send a request with the pending id he will get a signed id.```/get-signed-id```
- now if user hit the download endpoint using this id , he will able to download the signed document.

## Environment Variables
Required environment variables:
```
SIGNEASY_ACCESS_TOKEN=your_access_token
DATABASE=your_database_connection_string
PORT=4000 (default)
```
## To download signed document
 ### run on browser : http://localhost:4000/download
