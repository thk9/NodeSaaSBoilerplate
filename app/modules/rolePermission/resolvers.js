import {models} from "./../../../framework/database/connection.js";
import Model from "./../../../framework/model/model.js";
import validations from "./validations.js";
import getIdName from "./../../../framework/helpers/getIdName.js";
import dynamic from "./../../../framework/dynamic/index.js";
import {rolePermissionModel,permissionModel,roleModel} from "./../../../framework/dynamic/allModels.js";

let rolePermissionResolver = dynamic.resolvers({
  moduleName: 'RolePermission',
  validations: {
    create: validations.createRolePermission,
    delete: validations.deleteRolePermission,
    update: validations.updateRolePermission,
    view: validations.rolePermission
  },
  model: rolePermissionModel
});


export default {
  RolePermission: {
    async permission(rolePermission) {
      return await permissionModel.findOne({[getIdName]: rolePermission.permission})
    },
    async role(rolePermission) {
      return await roleModel.findOne({[getIdName]: rolePermission.role})
    }
  },
  queries: {
    ...dynamic.loader("RolePermission",rolePermissionResolver).queries
  },
  mutations: {
    ...dynamic.loader("RolePermission",rolePermissionResolver).mutations
  },
  
}