import dotenv from 'dotenv';

dotenv.config();

const AppConstants = { 
    apiPort : process.env.API_PORT,
    mongoURI : process.env.MONGO_URI,
    saltRounds : process.env.SALT_ROUNDS,
    jwtTokenKey : process.env.JWT_TOKEN_KEY,
    AWSaccessKeyId : process.env.AWS_ACCESS_KEY_ID,
    AWSsecretAccessKey : process.env.AWS_SECRET_ACCESS_KEY,
    AWSregion : process.env.S3_REGION,
    AWSbucket : process.env.S3_BUCKET
}

export default AppConstants;