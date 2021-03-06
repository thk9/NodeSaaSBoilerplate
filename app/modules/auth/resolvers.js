import internalServerError from "./../../../framework/helpers/internalServerError.js";
import {models} from "./../../../framework/database/connection.js";
import Model from "./../../../framework/model/model.js";
import bcrypt from "bcrypt-nodejs";
import createJwtToken from "./../../../framework/security/createJwtToken.js";
import isTokenExpired from "./../../../framework/security/isTokenExpired.js";
import moment from "moment";
import {get} from "lodash";
import validations from "./validations.js";
import validate from "./../../../framework/validations/validate.js";
import statusCodes from "./../../../framework/helpers/statusCodes";
import {sendEmail} from "./../../../framework/mailer/index.js";
import {ApolloError} from "apollo-server";
import getIdName from "./../../../framework/helpers/getIdName.js";
import {userModel, userRoleModel, roleModel, profileModel, userPermissionModel} from "./../../../framework/dynamic/allModels.js";


export default {
	queries: {
	},
	mutations: {
		loginWithAccessToken: async (_,args,g) => {
			let v = await validate(validations.loginWithAccessToken,args.input,{abortEarly: false});
			if (!v.success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
			}
			try {
				let user = await userModel.findOne({accessToken: args.input.accessToken});
				if (!user) {
					throw new ApolloError("Incorrect Access Token",statusCodes.NOT_FOUND.number);
				}
				if (isTokenExpired(user.accessToken)) {
					await user.update({
						accessToken: await createJwtToken({email: user.email,for: "authentication"})
					});
				}
				return user;
			} catch (e) {
				return internalServerError(e);
			}
		},
		twoFactorLogin: async (_, args, g) => {
			let v = await validate(validations.twoFactorLogin,args.input,{abortEarly: false});
			let {success} = v;
			if (!success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors});
			}
			try {
				let user = await userModel.findOne({email: args.input.email});
				if (!user) {
					throw new ApolloError("User Not found",statusCodes.NOT_FOUND.number)
				}
				let twoFactorCode = Math.floor(Math.random() * 100000);
				await user.update({
					twoFactorCode: twoFactorCode
				});
				await sendEmail('twoFactorLogin.hbs',{
	        twoFactorCode: twoFactorCode,
	        siteName: process.env.NAME,
	        userName: user.email
	      },{
	        from: process.env.MAILER_SERVICE_USERNAME,
	        to: get(args,'input.email',''),
	        subject: `${process.env.NAME} Two Factor Authorization`
	      });
	      return {
	      	successMessageType: "Success",
	      	successMessage: "Email Sent"
	      }
			} catch (e) {
				return internalServerError(e);
			}
		},
		twoFactorLoginValidate: async (_, args, g) => {
			let v = await validate(validations.twoFactorLoginValidate,args.input,{abortEarly: false});
			let {success} = v;
			if (!success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors});
			}
			try {
				let user = await userModel.findOne({twoFactorCode: args.input.twoFactorCode});
				if (!user) {
					throw new ApolloError("User Not found",statusCodes.NOT_FOUND.number)
				}
				let token = await createJwtToken({email: user.email,for: "authentication"});
				await user.update({
					accessToken: token,
					twoFactorCode: ""
				});
				user.accessToken = token;
				user.successMessage = "Success";
				user.successMessageType = "You are successfully logged in";
				user.statusCode = statusCodes.OK.type;
				user.statusCodeNumber = statusCodes.OK.number;
				return user;
			} catch (e) {
				return internalServerError(e);
			}

		},	
		activateAccount: async (_, args, g) => {
			let v = await validate(validations.activateAccount,args.input,{abortEarly: false});
			let {success} = v;
			if (!success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors});
			}
			try {
				let user = await userModel.findOne({activationToken: args.input.activationToken});
				if (!user) {
					throw new ApolloError("Not found",statusCodes.NOT_FOUND.number);
				}
				await user.update({
					activationToken: "",
					isActivated: true,
					activatedOn: moment().valueOf()
				});
				await sendEmail('accountActivated.hbs',{
	        username: user.email,
	        siteName: process.env.NAME,
	      },{
	        from: process.env.MAILER_SERVICE_USERNAME,
	        to: user.email,
	        subject: `Welcome to ${process.env.NAME}`
	      });
				return {
					statusCode: statusCodes.OK.type,
					statusCodeNumber: statusCodes.OK.number,
					successMessage: "Success",
					successMessageType: "Account successfully isActivated"
				}
			} catch (e) {
				return internalServerError(e);
			}
		},
		login: async (_,args,g) => {
			let v = await validate(validations.login,args.input,{abortEarly: false});
			let {success} = v;
			if (!success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors});
			}
			try {
				let { email, password } = args.input;
				let user = await userModel.findOne({email: email});
				let findEmail = get(user,'email',null);
				if (!findEmail) {
					throw new ApolloError("Not found",statusCodes.NOT_FOUND.number)
				}	
				let comparePassword = bcrypt.compareSync(password, user.password);
				if (!comparePassword) {
					throw new ApolloError("Incorrect Password",statusCodes.BAD_REQUEST.number)
				}
				let token = await createJwtToken({email: email,for: "authentication"});
				await user.update({
					accessToken: token
				});
				user.accessToken = token;
				user.successMessage = "Success";
				user.successMessageType = "You are successfully logged in";
				user.statusCode = statusCodes.OK.type;
				user.statusCodeNumber = statusCodes.OK.number;
				return user;
			} catch (e) {
				return internalServerError(e);
			}
		},
		signup: async (_,args,g) => {
			let v = await validate(validations.signup,args.input,{abortEarly: false});
			if (!v.success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
			}
			try {
				let { email, password, confirmPassword } = args.input;
	      let user = await userModel.findOne({
					email: email
				});
				if (user) throw new ApolloError("Email is already used",statusCodes.BAD_REQUEST.number)
				var hash = bcrypt.hashSync(password);
				let newUser = await userModel.create({
					email: email,
					referer: get(args.input,'referer',''),
					superUser: false,
					name: get(args.input,'name',''),
					accessToken: await createJwtToken({email: email,for: "authentication"}),
					refreshToken: await createJwtToken({email: email,for: "refreshToken"}),
					isActivated: false,
					isSuperUser: get(args.input,'isSuperUser',false),
					activationToken: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
					password: hash
				});
				await sendEmail('welcome.hbs',{
	        email: newUser.email,
	        username: newUser.email,
	        date: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
	        siteName: process.env.NAME,
	        activationUrl: `${process.env.FRONTEND_APP_URL}/activate-account/`,
	        activationToken: newUser.activationToken,
	      },{
	        from: process.env.MAILER_SERVICE_USERNAME,
	        to: newUser.email,
	        subject: `Welcome to ${process.env.NAME}`
	      });
	      await profileModel.create({
	      	description: '...',
	      	user: newUser[getIdName],
	      });
				newUser.statusCode = statusCodes.OK.type;
				newUser.statusCodeNumber = statusCodes.OK.number;
				newUser.successMessageType = "Registered";
				newUser.successMessage = "New user successfully created";
				return newUser;
			} catch (e) {
				return internalServerError(e);
			}
		},
		refreshToken:  async (_,args,g) => {
			let v = await validate(validations.refreshToken,args.input,{abortEarly: false});
			if (!v.success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
			}
			try {
				let user = await userModel.findOne({
					refreshToken: get(args,'input.refreshToken','')
				});
				if (!user) {
					throw new ApolloError("Refresh Token is Incorrect, please login again.",statusCodes.BAD_REQUEST.number)
				}

				let token = await createJwtToken({email: user.email,for: "authentication"});
				await user.update({
					accessToken: token
				});
				user.statusCode = statusCodes.OK.type;
				user.statusCodeNumber = statusCodes.OK.number;
				user.successMessageType = "Success";
				user.successMessage = "Access token refreshed";
				return user;
			} catch (e) {
				return internalServerError(e);
			}
		},
		
	}
}