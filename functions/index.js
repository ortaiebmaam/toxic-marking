const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const axios = require("axios");

// Initialize Firebase Admin
admin.initializeApp();

// Get collection names from environment variables
const POSTS_COLLECTION = process.env.POSTS_COLLECTION ||
  "posts-iteration-1.0";
const QUERIES_COLLECTION = process.env.QUERIES_COLLECTION ||
  "toxic-queries-test";
const ADMIN_UPDATE_URL = process.env.ADMIN_UPDATE_URL ||
  "https://httpbin.org/put";
const FUNCTION_REGION = process.env.FUNCTION_REGION ||
  "us-central1";

exports.monitorToxicContent = onDocumentWritten(
  `${POSTS_COLLECTION}/{documentId}`,
  async (event) => {
    // Get the data after the change
    const newData = event.data.after ? event.data.after.data() : null;

    // Check if the document was deleted
    if (!newData) {
      logger.info("Document deleted");
      return null;
    }

    // Check if flagged-as-toxic flag is true
    if (newData["flagged-as-toxic"] === true) {
      try {
        // Copy the document to queries collection
        const queryDoc = {
          ...newData,
          original_id: event.data.after.id,
          original_collection: POSTS_COLLECTION,
          processed_at: Timestamp.now(),
        };

        await admin.firestore()
          .collection(QUERIES_COLLECTION)
          .add(queryDoc);

        logger.info(
          "Copied toxic content to queries collection",
          {
            original_id: event.data.after.id,
            collection: QUERIES_COLLECTION,
          },
        );

        // Prepare headers
        const headers = {
          "post-id": newData["post-id"],
        };

        // Send PUT request to httpbin
        const response = await axios.put(
          ADMIN_UPDATE_URL,
          {},
          { headers },
        );

        // Log the response
        logger.info("Notification sent successfully:", response.data);

        return response.data;
      } catch (error) {
        logger.error("Error processing toxic content:", error);
        throw error;
      }
    } else {
      try {
        // Find and delete any matching documents in the queries collection
        const querySnapshot = await admin.firestore()
          .collection(QUERIES_COLLECTION)
          .where("original_id", "==", event.data.after.id)
          .get();

        // Delete all matching documents
        const deletePromises = querySnapshot.docs.map((doc) =>
          doc.ref.delete(),
        );

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          logger.info(
            "Removed entries from queries collection",
            {
              original_id: event.data.after.id,
              removed_count: deletePromises.length,
            },
          );
        }
      } catch (error) {
        logger.error("Error cleaning up queries collection:", error);
        throw error;
      }
    }

    return null;
  },
);

exports.handleToxicResolution = onRequest({
  methods: ['POST'],
  region: FUNCTION_REGION,
}, async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(part => part !== '');

    logger.info("Request path:", {
      path: req.path,
      parts: urlParts,
      length: urlParts.length
    });

    // Check if URL is in the correct format
    if (urlParts.length !== 4 || urlParts[0] !== 'posts' ||
      urlParts[2] !== 'toxic-resolution' ||
      (urlParts[3] !== 'accept' && urlParts[3] !== 'rejected')) {
      return res.status(400).json({
        error: "Invalid URL format. Expected /posts/{post-id}/toxic-resolution/accept or /posts/{post-id}/toxic-resolution/rejected",
        receivedParts: urlParts
      });
    }

    const postId = urlParts[1];
    const action = urlParts[3];

    // Verify post-id is provided
    if (!postId) {
      return res.status(400).json({
        error: "Missing post-id in request path"
      });
    }

    try {
      // Get the document directly by ID instead of querying by field
      const docRef = admin.firestore().collection(POSTS_COLLECTION).doc(postId);
      const docSnapshot = await docRef.get();

      // Check if document exists
      if (!docSnapshot.exists) {
        return res.status(404).json({
          error: `No document found with ID: ${postId}`
        });
      }

      // Determine update fields based on action
      const updateFields = {
        "flagged-as-toxic": false,
        "is-toxic": action === 'accept'
      };

      // Update the document
      await docRef.update(updateFields);

      logger.info(
        `Toxic resolution ${action} successfully processed`,
        {
          documentId: postId,
          action,
          region: FUNCTION_REGION
        }
      );

      return res.status(200).json({
        success: true,
        message: `Document ${postId} marked as ${action === 'accept' ? 'toxic' : 'not toxic'}`
      });
    } catch (firestoreError) {
      logger.error("Firestore error:", firestoreError);
      return res.status(500).json({
        error: "Error updating document",
        details: firestoreError.message
      });
    }

  } catch (error) {
    logger.error("Error processing toxic resolution:", error);
    return res.status(500).json({
      error: "Internal server error processing toxic resolution",
      details: error.message
    });
  }
});