import dotenv from 'dotenv';
dotenv.config();
const AppConstants = {
    apiPort: process.env.API_PORT,
    mongoURI: process.env.MONGO_URI,
    saltRounds: process.env.SALT_ROUNDS,
    jwtTokenKey: process.env.JWT_TOKEN_KEY
};
export default AppConstants;
