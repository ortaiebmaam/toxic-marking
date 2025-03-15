# Toxic Content Flag Monitor

This Firebase Cloud Function monitors a Firestore collection for toxic content flags and sends notifications when toxic content is detected.

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
   - Select "Functions" when prompted for features
   - Select "Use an existing project" and choose your Firebase project
   - Select "JavaScript" for the language
   - Say "Yes" to using ESLint
   - Say "Yes" to installing dependencies with npm

3. Install dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

4. Deploy the function:
   ```bash
   firebase deploy --only functions
   ```

## Functionality

The function monitors the `${POSTS_COLLECTION}` collection in Firestore. 
The function will check the value of a field `marked-as-toxic` in the document.

When value is `true`:

1. It will copy the document to `${QUERIES_COLLECTION}`collection (referenced by property: `original_id`).
2. Send a PUT message to `${ADMIN_UPDATE_URL} with post-id header carring the post-id of the updated message.

When value is `false` (or does not exists):

1. Remove the document from ${QUERIES_COLLECTION}

## Testing

To test locally:
```bash
cd functions
npm run serve
```

## Example Document Structure

```json
{
  "post-id": "123",
  "marked-as-toxic": true,
  "other-fields": "..."
}
``` 