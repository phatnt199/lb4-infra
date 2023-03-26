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
exports.CasbinLBAdapter = void 0;
const casbin_1 = require("casbin");
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const flatten_1 = __importDefault(require("lodash/flatten"));
const get_1 = __importDefault(require("lodash/get"));
const logger_helper_1 = require("./logger.helper");
const __1 = require("..");
const constants_1 = require("../common/constants");
// -----------------------------------------------------------------------------------------
class CasbinLBAdapter {
    constructor(datasource) {
        this.logger = logger_helper_1.LoggerFactory.getLogger([CasbinLBAdapter.name]);
        this.datasource = datasource;
    }
    // -----------------------------------------------------------------------------------------
    getRule(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { id, permissionId, modelType } = opts;
            let rs = [];
            let permissionMappingCondition = '';
            switch (modelType) {
                case constants_1.EnforcerDefinitions.PREFIX_USER: {
                    rs = [constants_1.EnforcerDefinitions.PTYPE_POLICY, `${constants_1.EnforcerDefinitions.PREFIX_USER}_${id}`];
                    permissionMappingCondition = `user_id = ${id} AND permission_id = ${permissionId}`;
                    break;
                }
                case constants_1.EnforcerDefinitions.PREFIX_ROLE: {
                    rs = [constants_1.EnforcerDefinitions.PTYPE_POLICY, `${constants_1.EnforcerDefinitions.PREFIX_ROLE}_${id}`];
                    permissionMappingCondition = `role_id = ${id} AND permission_id = ${permissionId}`;
                    break;
                }
                default: {
                    break;
                }
            }
            const [permissionRs, permissionMappingRs] = yield Promise.all([
                this.datasource.execute(`SELECT id, code, name FROM public."Permission" WHERE id = ${permissionId}`),
                this.datasource.execute(`SELECT id, effect FROM public."PermissionMapping" WHERE ${permissionMappingCondition}`),
            ]);
            if (!(permissionRs === null || permissionRs === void 0 ? void 0 : permissionRs.length) || !(permissionMappingRs === null || permissionMappingRs === void 0 ? void 0 : permissionMappingRs.length)) {
                return null;
            }
            const [permission] = permissionRs;
            const [permissionMapping] = permissionMappingRs;
            rs = [...rs, (_a = permission.code) === null || _a === void 0 ? void 0 : _a.toLowerCase(), constants_1.EnforcerDefinitions.ACTION_EXECUTE, permissionMapping.effect];
            return rs.join(', ');
        });
    }
    // -----------------------------------------------------------------------------------------
    getFilterCondition(filter) {
        let rs = null;
        if (!filter) {
            return rs;
        }
        const { principalType, principalValue } = filter;
        if (!principalValue) {
            return rs;
        }
        switch (principalType.toLowerCase()) {
            case 'role': {
                rs = `role_id = ${principalValue}`;
                break;
            }
            case 'user': {
                rs = `user_id = ${principalValue}`;
                break;
            }
            default: {
                break;
            }
        }
        return rs;
    }
    // -----------------------------------------------------------------------------------------
    generatePolicyLine(rule) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, roleId, permissionId } = rule;
            let rs = '';
            if (!userId && !roleId) {
                return rs;
            }
            if (userId) {
                rs = yield this.getRule({ id: userId, permissionId, modelType: constants_1.EnforcerDefinitions.PREFIX_USER });
                return rs;
            }
            rs = yield this.getRule({ id: roleId, permissionId, modelType: constants_1.EnforcerDefinitions.PREFIX_ROLE });
            return rs;
        });
    }
    // -----------------------------------------------------------------------------------------
    generateGroupLine(rule) {
        const { userId, roleId } = rule;
        const rs = [
            constants_1.EnforcerDefinitions.PTYPE_GROUP,
            `${constants_1.EnforcerDefinitions.PREFIX_USER}_${userId}`,
            `${constants_1.EnforcerDefinitions.PREFIX_ROLE}_${roleId}`,
        ];
        return rs.join(',');
    }
    // -----------------------------------------------------------------------------------------
    loadFilteredPolicy(model, filter) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = filter === null || filter === void 0 ? void 0 : filter.principalType) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'role') {
                throw (0, __1.getError)({
                    statusCode: 500,
                    message: '[loadFilteredPolicy] Only "User" is allowed for filter principal type!',
                });
            }
            const aclQueries = [];
            // Load user permission policies
            const userPermissionExecution = this.datasource.execute(`SELECT * FROM public."ViewAuthorizePolicy" WHERE subject=$1`, [`user_${filter.principalValue}`]);
            aclQueries.push(userPermissionExecution);
            // Load role permission policies
            const userRoles = yield this.datasource.execute(`SELECT * FROM public."UserRole" WHERE user_id=$1`, [
                filter.principalValue,
            ]);
            for (const userRole of userRoles) {
                const execution = this.datasource.execute(`SELECT * FROM public."ViewAuthorizePolicy" WHERE subject=$1`, [
                    `role_${userRole.principal_id}`,
                ]);
                aclQueries.push(execution);
            }
            // Load policy lines
            const policyRs = (0, flatten_1.default)(yield Promise.all(aclQueries));
            for (const el of policyRs) {
                if (!el) {
                    continue;
                }
                for (const policyLine of el.policies) {
                    casbin_1.Helper.loadPolicyLine(policyLine, model);
                    this.logger.debug('[loadFilteredPolicy] Load policy: %s', policyLine);
                }
            }
            // Load group lines
            for (const userRole of userRoles) {
                const groupLine = this.generateGroupLine({
                    userId: (0, get_1.default)(userRole, 'user_id'),
                    roleId: (0, get_1.default)(userRole, 'principal_id'),
                });
                if (!groupLine || (0, isEmpty_1.default)(groupLine)) {
                    continue;
                }
                casbin_1.Helper.loadPolicyLine(groupLine, model);
                this.logger.debug('[loadFilteredPolicy] Load groupLine: %s', groupLine);
            }
        });
    }
    // -----------------------------------------------------------------------------------------
    isFiltered() {
        return true;
    }
    // -----------------------------------------------------------------------------------------
    loadPolicy(_) {
        return __awaiter(this, void 0, void 0, function* () {
            /* const acls = await this.datasource.execute('SELECT * FROM public."PermissionMapping"');
            for (const acl of acls) {
              const policyLine = await this.generatePolicyLine({
                userId: get(acl, 'user_id'),
                roleId: get(acl, 'role_id'),
                permissionId: get(acl, 'permission_id'),
              });
              if (!policyLine || isEmpty(policyLine)) {
                continue;
              }
        
              Helper.loadPolicyLine(policyLine, model);
              this.logger.info('[loadPolicy] Load policy: %s', policyLine);
            } */
            return;
        });
    }
    // -----------------------------------------------------------------------------------------
    savePolicy(model) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('[savePolicy] Ignore save policy method with options: ', { model });
            return true;
        });
    }
    // -----------------------------------------------------------------------------------------
    addPolicy(sec, ptype, rule) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('[addPolicy] Ignore add policy method with options: ', { sec, ptype, rule });
        });
    }
    // -----------------------------------------------------------------------------------------
    removePolicy(sec, ptype, rule) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('[removePolicy] Ignore remove policy method with options: ', { sec, ptype, rule });
        });
    }
    // -----------------------------------------------------------------------------------------
    removeFilteredPolicy(sec, ptype, fieldIndex, ...fieldValues) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (ptype) {
                case constants_1.EnforcerDefinitions.PREFIX_USER: {
                    // Remove user policy
                    break;
                }
                case constants_1.EnforcerDefinitions.PREFIX_ROLE: {
                    // Remove role policy
                    break;
                }
                default: {
                    break;
                }
            }
            this.logger.info('[removeFilteredPolicy] Ignore remove filtered policy method with options: ', {
                sec,
                ptype,
                fieldIndex,
                fieldValues,
            });
        });
    }
}
exports.CasbinLBAdapter = CasbinLBAdapter;
//# sourceMappingURL=casbin-lb-adapter.helper.js.map