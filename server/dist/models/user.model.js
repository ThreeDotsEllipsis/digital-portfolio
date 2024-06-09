"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const UserSchema = new mongoose_1.Schema({
    name: String,
    surname: String,
    paternalName: String,
    vkId: String,
    phoneNumber: String,
    socials: [String],
    bio: String,
    _oldAvatar: String,
    avatar: {
        type: String,
        set: function (value) {
            //@ts-expect-error defined on schema
            this._oldAvatar = this.avatar;
            return value;
        }
    },
    password: String,
    email: String,
    verified: { type: Boolean, default: false },
    portfolio: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "portfolio",
    },
    subscriptions: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "user",
        }],
    liked: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "achievement",
        }],
});
UserSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.avatar && this.isModified("avatar") && this._oldAvatar) {
            const photoName = path_1.default.resolve(__dirname, "..", "public/photos/" + this._oldAvatar);
            try {
                yield promises_1.default.unlink(photoName);
            }
            catch (err) {
                console.error(err);
            }
        }
        if (!this.isModified("password"))
            return next();
        try {
            const salt = yield bcrypt_1.default.genSalt(10);
            if (this.password)
                this.password = yield bcrypt_1.default.hash(this.password, salt);
            return next();
        }
        catch (error) {
            return next(error);
        }
    });
});
const User = mongoose_1.default.model("user", UserSchema);
exports.default = User;
//# sourceMappingURL=user.model.js.map