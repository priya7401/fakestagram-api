Steps to run the project in local:

1. Create .env file inside project folder with the following contents:
   ```
      PORT=
      MONGO_URI=
      SALT_ROUNDS=
      JWT_TOKEN_KEY=
      AWS_ACCESS_KEY_ID=
      AWS_SECRET_ACCESS_KEY=
      S3_REGION=
      S3_BUCKET= 
2. Run "npm i" to install all the dependencies
3. Add the firebase admin sdk private key json file inside the "firebase-config" directory
4. Change the import statement for the above json file in firebase-config.ts file
5. Run "npm dev" - this will start the app.ts file as the starting point for the server using nodemon
