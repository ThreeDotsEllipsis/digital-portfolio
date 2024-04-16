"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const multer_1 = __importDefault(require("multer"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mailersend_1 = require("mailersend");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const user_model_1 = __importDefault(require("../models/user.model"));
const portfolio_model_1 = __importDefault(require("../models/portfolio.model"));
dotenv_1.default.config();
const router = express_1.default.Router();
const upload = (0, multer_1.default)();
const mailerSend = new mailersend_1.MailerSend({
    apiKey: process.env.EMAIL_API,
});
router.route("/").get((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield user_model_1.default.find({});
    res.status(200).send(users);
}));
router.route("/register").post(upload.none(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = req.body.username;
        const password = bcrypt_1.default.hashSync(req.body.password, 10);
        const email = req.body.email;
        const existUser = yield user_model_1.default.findOne({
            $or: [
                { email },
                { username },
            ]
        });
        if (existUser) {
            throw new Error("user already exsits: " + username);
        }
        const portfolio = yield portfolio_model_1.default.create({});
        const user = yield user_model_1.default.create({ username, password, email });
        portfolio.owner = user._id;
        user.portfolio = portfolio._id;
        portfolio.save();
        user.save();
        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not register user");
    }
}));
router.route("/login").post(upload.none(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = yield user_model_1.default.findOne({ email });
        if (!user)
            throw new Error("could not find user with email: " + email);
        if (!bcrypt_1.default.compareSync(password, user.password))
            throw new Error("wrong password for user with email: " + email);
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.LOGIN_SECRET, {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: 86400 * 365, // 24 hours (* 365 days for testing)
        });
        res.status(200).send({
            user,
            accessToken: token
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not login user");
    }
}));
router.route("/me").get(auth_middleware_1.default.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = res.locals.userId;
    const user = yield user_model_1.default.findOne({ _id: userId }).populate({
        path: "portfolio",
        populate: {
            path: "projects certificates"
        }
    });
    user === null || user === void 0 ? void 0 : user.portfolio;
    if (!user)
        throw new Error("could not authenticate user with id: " + userId);
    res.status(200).send(user);
}));
router.route("/me").put(auth_middleware_1.default.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = res.locals.userId;
        const user = yield user_model_1.default.findOne({ _id: userId });
        // Make some changes 
        user === null || user === void 0 ? void 0 : user.save();
        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not update user profile");
    }
}));
router.route("/me/verify").put(auth_middleware_1.default.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = res.locals.userId;
        const user = yield user_model_1.default.findOne({ _id: userId });
        const token = jsonwebtoken_1.default.sign({ id: user === null || user === void 0 ? void 0 : user.id }, process.env.VERIFICATION_SECRET, {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: 3600, // 1 hour
        });
        if (user) {
            const link = `http://localhost:4000/api/users/verify/${user.id}/${token}`;
            const sender = new mailersend_1.Sender(process.env.EMAIL_HOST, "Digital Portfolio");
            const recipient = [new mailersend_1.Recipient(user.email, user.username)];
            const emailParams = new mailersend_1.EmailParams()
                .setFrom(sender)
                .setTo(recipient)
                .setSubject("Email verification")
                .setHtml(`<section><h1>Click link below to verify email</h1><a>${link}</a></section>`);
            yield mailerSend.email.send(emailParams);
        }
        res.send(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not initiate verification for user");
    }
}));
router.route("/reset").post(upload.none(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        const user = yield user_model_1.default.findOne({ email: email });
        const token = jsonwebtoken_1.default.sign({ id: user === null || user === void 0 ? void 0 : user.id }, process.env.VERIFICATION_SECRET, {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: 3600, // 1 hour
        });
        if (user) {
            // Link to the frontend password reset form, link reset token
            const link = `http://localhost:4000/api/users/reset/${user.id}/${token}`;
            const sender = new mailersend_1.Sender(process.env.EMAIL_HOST, "Digital Portfolio");
            const recipient = [new mailersend_1.Recipient(user.email, user.username)];
            const emailParams = new mailersend_1.EmailParams()
                .setFrom(sender)
                .setTo(recipient)
                .setSubject("Password reset")
                .setHtml(`<section><h1>Click link below to reset your password</h1><a>${link}</a></section>`);
            yield mailerSend.email.send(emailParams);
        }
        res.send(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not initiate password reset for user");
    }
}));
router.route("/verify/:id/:token").get((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findOne({ _id: req.params.id });
        if (!user) {
            throw new Error();
        }
        jsonwebtoken_1.default.verify(req.params.token, process.env.VERIFICATION_SECRET, (err, decoded) => {
            if (err) {
                throw new Error("can not decode provided token: " + req.params.token);
            }
            if (decoded.id === req.params.id) {
                user.verified = true;
                user.save();
            }
            else {
                throw new Error("token does not match user id");
            }
        });
        res.sendStatus(200);
        // redirect to frontend home page
        //res.redirect()
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not verify user with id: " + req.params.id);
    }
}));
router.route("/reset/:id/:token").post(upload.none(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findOne({ _id: req.params.id });
        const password = req.body.password;
        if (!user) {
            throw new Error();
        }
        jsonwebtoken_1.default.verify(req.params.token, process.env.VERIFICATION_SECRET, (err, decoded) => {
            if (err) {
                throw new Error("can not decode provided token: " + req.params.token);
            }
            if (decoded.id === req.params.id) {
                user.password = password;
                user.save();
                res.sendStatus(200);
                // redirect to frontend home page
                //res.redirect()
            }
            else {
                throw new Error("token does not match user id");
            }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not reset password for user with id: " + req.params.id);
    }
}));
router.route("/me/subscribe").get(auth_middleware_1.default.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = res.locals.userId;
        const user = yield user_model_1.default.findOne({ _id: userId }).populate({
            path: "subscriptions",
            populate: {
                path: "portfolio", populate: { path: "projects certificates" },
            }
        });
        res.send(user === null || user === void 0 ? void 0 : user.subscriptions);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not get subscriptions for user");
    }
}));
router.route("/me/subscribe/:subId").put(auth_middleware_1.default.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = res.locals.userId;
        const user = yield user_model_1.default.findOne({ _id: userId });
        const subUser = yield user_model_1.default.findOne({ _id: req.params.subId });
        if (subUser) {
            user === null || user === void 0 ? void 0 : user.subscriptions.push(subUser._id);
            user === null || user === void 0 ? void 0 : user.save();
        }
        else
            throw new Error();
        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not subscribe to user with id: " + req.params.subId);
    }
}));
router.route("/:id").get((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findOne({ _id: req.params.id }).populate({
            path: "portfolio",
            populate: {
                path: "projects certificates"
            }
        });
        res.status(200).send(user);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not find user with id: " + req.params.id);
    }
}));
exports.default = router;
