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

The function monitors the `my-collection` collection in Firestore. When a document is created or updated with the field `marked-as-toxic` set to `true`, it will:

1. Send a PUT request to https://httpbin.org/put
2. Include headers:
   - `post-id`: The value from the document's "post-id" field
   - `marked-as-toxic`: true
3. Log the response from the request

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