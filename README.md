# Toxic Content Flag Monitor

This Firebase Cloud Function monitors a Firestore collection for toxic content flags, sends notifications, and emails when toxic content is detected.

## Setup

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

   Or with Homebrew:
   ```bash
   brew install firebase-cli
   ```

2. Initialize Firebase:
   ```bash
   firebase login
   firebase init
   ```

   During the `firebase init` process:
   - Select "Functions" and "Extensions" when prompted for features
   - Select "Use an existing project" and choose your Firebase project
   - Select "JavaScript" for the language
   - Say "Yes" to using ESLint
   - Say "Yes" to installing dependencies with npm

3. Install the Firebase Email Extension:
   ```bash
   firebase ext:install firebase/firestore-send-email
   ```

   During the installation process:
   - Set the collection name to "mail" (or your preferred name)
   - Configure your SendGrid API key
   - Set other extension options as needed

4. Update the environment variables in firebase.json:
   - Edit the `EMAIL_RECIPIENTS` to include your comma-separated list of email addresses
   - Customize `EMAIL_SUBJECT` and `EMAIL_BODY` as needed

5. Install dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

6. Deploy the function and extension:
   ```bash
   firebase deploy --only functions,extensions
   ```

## Prerequisites

- Firebase project with Firestore enabled
- Firebase "Trigger Email" extension installed and configured
- SendGrid account with API key (required by the extension)

## Functionality

The function monitors the `${POSTS_COLLECTION}` collection in Firestore. 
The function will check the value of a field `flagged-as-toxic` in the document.

When value is `true`:

1. It copies the document to `${QUERIES_COLLECTION}` collection (referenced by property: `original_id`).
2. Sends a PUT message to `${ADMIN_UPDATE_URL}` with post-id header carrying the post-id of the updated message.
3. Creates a document in the "mail" collection that triggers the Firebase Email Extension to send an email notification.

When value is `false` (or does not exist):

1. Removes the document from ${QUERIES_COLLECTION}

## Email Notification System

The email notification system uses the Firebase Extension "Trigger Email" powered by SendGrid to send alerts when toxic content is detected. Configuration parameters include:

- **Recipients**: Comma-separated list of email addresses to receive notifications
- **Subject**: Customizable email subject
- **Body**: Customizable email body text

To customize the email template:
1. Navigate to the Firebase console
2. Go to Extensions
3. Select the "Trigger Email" extension
4. Update the templates section

## Testing

To test locally with emulators:
```bash
cd functions
npm run serve
```

Note: While running in the emulator, the email extension won't actually send emails unless you configure the extension to connect to your real Firebase project.

## Example Document Structure

```json
{
  "post-id": "123",
  "flagged-as-toxic": true,
  "other-fields": "..."
}
```

## Email Document Structure

This is the structure of documents created in the "mail" collection that trigger emails:

```json
{
  "to": ["admin@example.com", "support@example.com"],
  "message": {
    "subject": "Toxic Content Alert - Action Required",
    "text": "A document has been flagged as toxic content...",
    "html": "<p>A document has been flagged as toxic content...</p>"
  },
  "template": {
    "name": "toxic-content-alert",
    "data": {
      "postId": "123",
      "documentId": "abc123",
      "timestamp": "2025-03-22T12:34:56.789Z"
    }
  }
}
```