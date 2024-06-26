import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { body, query } from "express-validator";

import auth from "../middlewares/auth.middleware";
import User from "../models/user.model";
import Portfolio from "../models/portfolio.model";
import validation from "../middlewares/validate.middleware";
import mailsend from "../middlewares/mailsend.middleware";
import { siteUrl } from "../utils/config.util";

dotenv.config();

const router = express.Router();
const upload = multer({ dest: path.resolve(__dirname, "..", "public/photos/") });

function makeid(length: number): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

async function fetchData(url: string): Promise<any> {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.response) {
        throw new Error("could not fetch data with url: " + url);
    }

    return data.response;
}


router.route("/").get(async (req, res) => {
    try {
        const users = await User.find({});

        res.status(200).send(users);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not get users: " + err);
    }
});

router.route("/register").post(
    upload.none(),
    body("email").notEmpty().isEmail(),
    body("password").notEmpty(),
    body("username").notEmpty(),
    validation.validateForm,
    async (req, res) => {
        try {
            const username: string[] = req.body.username.split(" ");
            if (username.length < 2) {
                throw new Error("incorrect username input");
            }
            const name = username[0];
            const surname = username[1];
            let paternalName: string | null = null;
            if (username.length > 2)
                paternalName = username[2];

            const password = req.body.password;
            const email = req.body.email;

            const existUser = await User.findOne({ email });

            if (existUser) {
                throw new Error("user already exsits: " + email);
            }

            const portfolio = await Portfolio.create({});
            const user = await User.create({ name, surname, password, email });

            if (paternalName != null) {
                user.paternalName = paternalName;
            }

            portfolio.owner = user._id;
            user.portfolio = portfolio._id;

            await portfolio.save();
            await user.save();

            await mailsend.sendVerifyEmail(user._id.toString());

            res.sendStatus(200);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not register user " + err);
        }
    }
);

router.route("/login").post(
    upload.none(),
    body("email").notEmpty().isEmail(),
    body("password").notEmpty(),
    validation.validateForm,
    async (req, res) => {
        try {
            const email = req.body.email;
            const password: string = req.body.password;

            const user = await User.findOne({ email });

            if (!user)
                throw new Error("could not find user with email: " + email);

            if (!bcrypt.compareSync(password, user.password as string))
                throw new Error("wrong password for user with email: " + email);

            const token = auth.generateToken(user.id, process.env.LOGIN_SECRET as string, 86400 * 365);

            res.status(200).send({
                user,
                accessToken: token
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not login user" + err);
        }
    }
);

router.route("/loginVK").post(
    upload.none(),
    body("silentToken").notEmpty(),
    body("uuid").notEmpty(),
    validation.validateForm,
    async (req, res) => {
        try {
            const silentToken = req.body.silentToken;
            const uuid = req.body.uuid;
            const vkApi = process.env.VK_API;

            let url = "https://api.vk.com/method/auth.exchangeSilentAuthToken?" + `v=5.131&token=${silentToken}&access_token=${vkApi}&uuid=${uuid}`;
            const generalData = await fetchData(url);

            url = "https://api.vk.com/method/account.getProfileInfo?" + `v=5.131&access_token=${generalData.access_token}`;
            const profileData = await fetchData(url);

            let user = await User.findOne({ vkId: generalData.user_id });

            if (!user) {
                const portfolio = await Portfolio.create({});
                user = await User.create({
                    verified: true,
                    vkId: generalData.user_id,
                    name: profileData.first_name,
                    surname: profileData.last_name,
                    password: makeid(10),
                    email: generalData.email,
                    phoneNumber: profileData.phone,
                });

                portfolio.owner = user._id;
                user.portfolio = portfolio._id;

                await portfolio.save();
                await user.save();
            }

            const token = auth.generateToken(user.id, process.env.LOGIN_SECRET as string, 86400 * 365);

            res.status(200).send({
                user,
                accessToken: token
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not login user through VK" + err);
        }
    }
);

router.route("/me").get(auth.verifyToken, async (req, res) => {
    try {
        const userId = res.locals.userId;

        const user = await User.findOne({ _id: userId }).populate({
            path: "portfolio",
            populate: {
                path: "achievements"
            }
        });

        if (!user) throw new Error("could not authenticate user with id: " + userId);

        res.status(200).send(user);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not get user profile page: " + err)
    }
});

router.route("/byEmail").get(
    upload.none(),
    body("email").notEmpty().isEmail(),
    validation.validateForm,
    async (req, res) => {
        try {
            const email = req.body.email;

            const user = await User.findOne({ email: email });

            if (!user) throw new Error("no user with email: " + email);

            res.status(200).send(user);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not find user: " + err);
        }
    }
);

router.route("/me").put(
    auth.verifyToken,
    upload.single("avatar"),
    body("bio").default(""),
    validation.validateForm,
    async (req, res) => {
        try {
            const userId = res.locals.userId;
            const bio = req.body.bio;

            const user = await User.findOne({ _id: userId });
            if (!user) throw new Error("could not authenticate user with id: " + userId);

            if (req.file) {
                user.avatar = req.file.filename;
            }

            user.bio = bio;

            await user.save();

            res.sendStatus(200);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not update user profile: " + err);
        }
    }
);


router.route("/reset").post(
    upload.none(),
    body("email").notEmpty().isEmail(),
    validation.validateForm,
    async (req, res) => {
        try {
            const email = req.body.email;

            const user = await User.findOne({ email: email });
            if (!user) throw new Error("could not find user with email: " + email);

            mailsend.sendResetEmail(user._id.toString());

            res.send(200);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not initiate password reset for user: " + err);
        }
    }
);

router.route("/verify/:id/:token").get(async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });

        if (!user) throw new Error("could not find user with id: " + req.params.id);

        jwt.verify(
            req.params.token as string,
            process.env.VERIFICATION_SECRET as string,
            (err, decoded) => {
                if (err) {
                    throw new Error("can not decode provided token: " + req.params.token);
                }
                if ((decoded as jwt.JwtPayload).id === req.params.id) {
                    user.verified = true;
                    user.save();
                }
                else {
                    throw new Error("token does not match user id");
                }
            }
        );

        res.status(200).redirect(siteUrl);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not verify user: " + err);
    }
});

router.route("/reset/:id/:token").post(upload.none(),
    body("password").notEmpty(),
    validation.validateForm,
    async (req, res) => {
        try {
            const user = await User.findOne({ _id: req.params.id });
            const password = req.body.password;

            if (!user) throw new Error("could not find user with id: " + req.params.id);

            jwt.verify(
                req.params.token as string,
                process.env.VERIFICATION_SECRET as string,
                (err, decoded) => {
                    if (err) {
                        throw new Error("can not decode provided token: " + req.params.token);
                    }
                    if ((decoded as jwt.JwtPayload).id === req.params.id) {
                        user.password = password;
                        user.save();
                        res.sendStatus(200);
                    }
                    else {
                        throw new Error("token does not match user id");
                    }
                }
            );
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not reset password for user: " + err);
        }
    }
);

router.route("/me/subscribe").get(
    query("query").default("").escape(),
    auth.verifyToken,
    async (req, res) => {
        try {
            let hasQuery = false;
            let searchKey = new RegExp("", "i");

            if (req.query.query) {
                hasQuery = true;
                searchKey = new RegExp(`${req.query.query}`, "i");
            }

            const userId = res.locals.userId;

            const user = await User.findOne({ _id: userId }).populate({
                path: "subscriptions",
                populate: {
                    path: "portfolio", populate: { path: "achievements" },
                }
            });

            if (!user) throw new Error("could not find user: " + userId);

            let subs = user.subscriptions;

            if (hasQuery) {
                subs = subs.filter((sub) => searchKey.test(mailsend.getFullName(sub)));
            }

            res.send(subs);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("could not get subscriptions for user: " + err);
        }
    }
);

router.route("/me/subscribe/:subId").put(auth.verifyToken, async (req, res) => {
    try {
        const userId = res.locals.userId;

        const user = await User.findOne({ _id: userId });
        const subUser = await User.findOne({ _id: req.params.subId });

        if (!user) throw new Error("could not find user: " + userId);
        if (!subUser) throw new Error("could not find target user: " + req.params.subId);

        if (user.subscriptions.includes(subUser._id)) {
            user.subscriptions = user.subscriptions.filter((sub) => sub._id.toString() != subUser._id.toString());
        }
        else {
            user.subscriptions.push(subUser._id);
        }

        await user.save();

        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not subscribe to user: " + err);
    }
});

router.route("/:id").get(async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).populate({
            path: "portfolio",
            populate: {
                path: "achievements"
            }
        });

        if (!user) throw new Error("no user with id: " + req.params.id);

        res.status(200).send(user);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("could not find user: " + err);
    }
});


export default router;