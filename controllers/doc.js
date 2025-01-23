const docSchema = require("../model/doc")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const { ObjectID } = require('bson');
const FormData = require('form-data');

module.exports.uploadOriginal = async(req,res)=>{
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file provided"
            });
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        formData.append('name', req.file.originalname);
        formData.append('rename_if_exists', '1');

        const response = await axios.post('https://api.signeasy.com/v3/original/', formData, {
            headers: {
                'Authorization': `Bearer ${process.env.SIGNEASY_ACCESS_TOKEN}`,
                ...formData.getHeaders()
            }
        });

        await docSchema.findByIdAndUpdate(ObjectID(req.body.id), {
            $set: {
                originalId: response.data.id,
                x: Number(req.body.x),
                y: Number(req.body.y)
            }
        });

        await fs.promises.unlink(req.file.path);
        console.log("Deleted file after uploading");

        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: response.data
        });
    } catch (error) {
        if (req.file && req.file.path) {
            // Cleanup uploaded file in case of error
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
}

module.exports.addDoc = async(req,res)=>{
    try {
        if (!req.body.id || !req.body.amount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: id and amount"
            });
        }

        const doc = new docSchema({
            billingId: req.body.id,
            amount: req.body.amount,
        });

        await doc.save();
        return res.status(200).json({
            success: true,
            message: "Document added successfully",
            data: doc
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports.sendEnvelope = async(req,res)=>{
    try {
        const { doc_id, first_name, last_name, email } = req.body;
        
        if (!doc_id || !first_name || !last_name || !email) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: doc_id, first_name, last_name, email"
            });
        }

        const doc = await docSchema.findById(ObjectID(doc_id));
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        const response = await axios.post('https://api.signeasy.com/v3/rs/envelope/', {
            embedded_signing: true,
            is_ordered: false,
            message: "This is for you to confirm your payment",
            sources: [
                {
                    id: Number(doc.originalId),
                    type: "original",
                    name: "CONFIDENTIAL",
                    source_id: 1
                }
            ],
            recipients: [
                {
                    first_name,
                    last_name,
                    email,
                    recipient_id: 1
                }
            ],
            signature_panel_types: ["draw", "type"],
            initial_panel_types: ["draw"],
            fields_payload: [
                {
                    recipient_id: 1,
                    source_id: 1,
                    type: "signature",
                    required: true,
                    page_number: "all",
                    position: {
                        height: 100,
                        width: 100,
                        x: doc.x,
                        y: doc.y,
                        mode: "fixed"
                    },
                    additional_info: {}
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SIGNEASY_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const signingUrlResponse = await axios.post(
            `https://api.signeasy.com/v3/rs/envelope/${response.data.id}/signing/url/`,
            { recipient_email: email },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SIGNEASY_ACCESS_TOKEN}`,
                }
            }
        );

        doc.pendingId = response.data.id;
        await doc.save();

        return res.status(200).json({
            success: true,
            data: {
                ...signingUrlResponse.data,
                pending_id: response.data.id
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
}

module.exports.getSignedId = async(req,res)=>{
    try {
        const { pending_id, doc_id } = req.body;
        
        if (!pending_id || !doc_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: pending_id, doc_id"
            });
        }

        const response = await axios.get(
            `https://api.signeasy.com/v3/rs/envelope/signed/pending/${pending_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SIGNEASY_ACCESS_TOKEN}`
                }
            }
        );

        if (response.data.id) {
            const doc = await docSchema.findById(ObjectID(doc_id));
            if (!doc) {
                return res.status(404).json({
                    success: false,
                    message: "Document not found"
                });
            }

            doc.signedId = response.data.id;
            await doc.save();
            
            return res.status(200).json({
                success: true,
                message: "Signed ID added successfully",
                data: {
                    signed_id: response.data.id
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Document not yet signed",
            data: response.data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
}

// Download signed document
module.exports.downloadEnvelopeAndCertificate = async(req,res)=>{
    try {
        const { signed_id } = req.params;
        
        if (!signed_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: signed_id"
            });
        }

        try {
            const response = await axios({
                method: 'GET',
                url: `https://api.signeasy.com/v3/signed/${signed_id}/download`,
                params: {
                    type: 'merged',
                    include_certificate: true
                },
                headers: {
                    'Authorization': `Bearer ${process.env.SIGNEASY_ACCESS_TOKEN}`
                },
                responseType: 'stream'
            });

            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=signed_document_${signed_id}.pdf`);

            // Pipe the response directly to the client
            response.data.pipe(res);

            // Handle errors during streaming
            response.data.on('error', (error) => {
                console.error('Error streaming file:', error);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Error downloading file'
                    });
                }
            });

            // Clean up when the response is finished
            res.on('finish', () => {
                console.log('Download completed successfully');
            });

        } catch (error) {
            handleDownloadError(error, res);
        }
    } catch (error) {
        handleDownloadError(error, res);
    }
}

// Helper function to handle download errors
function handleDownloadError(error, res) {
    if (!res.headersSent) {
        if (error.response) {
            if (error.response.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: "File not found. Please ensure the ID is correct."
                });
            } else if (error.response.status === 401) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication failed. Please check your API token."
                });
            }
        }
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message,
            details: error.response?.data || 'No additional details available'
        });
    }
}
