import mongoose from "mongoose";
import * as EmailValidator from 'email-validator';
const userAuthSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'email is required'],
        unique: true,
        validate: [
            {
                validator: function (value) {
                    return !(value == null || value.length == 0);
                },
                message: 'email cannot be empty'
            },
            {
                validator: function (value) {
                    return (EmailValidator.validate(value));
                },
                message: 'invalid email!'
            }
        ]
    },
    password: {
        type: String,
        required: [true, 'password is required'],
        minLength: [8, 'Password must consist of minimum 8 characters'],
        select: false
    },
    token: {
        type: String
    },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
const UserAuth = mongoose.model("UserAuth", userAuthSchema);
export { userAuthSchema, UserAuth };
