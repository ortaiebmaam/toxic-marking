const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {Timestamp} = require("firebase-admin/firestore");
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

      // Check if marked-as-toxic flag is true
      if (newData["marked-as-toxic"] === true) {
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
              {headers},
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
