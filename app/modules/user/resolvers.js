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
import {userModel,userRoleModel,roleModel,profileModel, userPermissionModel} from "./../../../framework/dynamic/allModels.js";

export default {
	User: {
		async assignedPermissions(user) {
			let userPermission = await userPermissionModel.paginate();
			return userPermission;
		},
		async assignedRoles() {
			let userRoles = await userRoleModel.paginate();
			return userRoles;
		},
		async profile(user) {
			return await profileModel.findOne({user: user[getIdName] })
		}
	},
	queries: {
		listUsers: async (_, args, g) => {
			try {
				let paginate = await userModel.paginate(args);
				return paginate;
			} catch (e) {
				return internalServerError(e);
			}
		},
		viewUser: async (_,args,g) => {
			let v = await validate(validations.viewUser,args,{abortEarly: false});
			if (!v.success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
			}
			try {
				let user = await userModel.view(args);
				return user;
			} catch (e) {
				return internalServerError(e);
			}
		},
	},
	mutations: {
		changePassword: async (_,args,g) => {
			let v = await validate(validations.changePassword,args,{abortEarly: false});
			if (!v.success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
			}
			try {
				let user = await userModel.view(args);
				if (!user) {
					throw new ApolloError("User not found",statusCodes.BAD_REQUEST.number);
				}
				let correctPassword = bcrypt.compareSync(args.oldPassword, user.password);
				if (!correctPassword) {
					throw new ApolloError("Password incorrect",statusCodes.BAD_REQUEST.number);
				}
				await user.update({
					password: bcrypt.hashSync(args.newPassword)
				});
				await sendEmail('changePassword.hbs',{
	        userName: user.email,
	        siteName: process.env.NAME,
	        email: user.email,
	      },{
	        from: process.env.MAILER_SERVICE_USERNAME,
	        to: user.email,
	        subject: "Password changed"
	      });
				let response = {};
				response.statusCode = statusCodes.OK.type;
				response.statusCodeNumber = statusCodes.OK.number;
				response.successMessageType = "Success";
				response.successMessage = "Password changed";
				return response;
			} catch (e) {
				return internalServerError(e);
			}
		},
		deleteUser: async (_, args, g) => {
      let v = await validate(validations.deleteUser,args,{abortEarly: false});
      let {success} = v;
      if (!success) {
        throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
      }
      try {
        return await userModel.delete(args);
      } catch (e) {
        return internalServerError(e);
      }
    },
		updateUser: async (_,args,g) => {
			let v = await validate(validations.updateUser,args,{abortEarly: false});
			if (!v.success) {
				throw new ApolloError("Validation error",statusCodes.BAD_REQUEST.number,{list: v.errors})
			}
			try {
				let user = await userModel.findOne({[getIdName]: args[getIdName]});
				if (!user) {
					throw new ApolloError("User not found",statusCodes.NOT_FOUND.number)
				}
				return await user.update(args);
			} catch (e) {
				return internalServerError(e);
			}
		},
	},

}