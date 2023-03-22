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
exports.CasbinLBAdapter = exports.EnforcerDefinitions = void 0;
const casbin_1 = require("casbin");
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const logger_helper_1 = require("./logger.helper");
class EnforcerDefinitions {
}
exports.EnforcerDefinitions = EnforcerDefinitions;
EnforcerDefinitions.ACTION_EXECUTE = 'execute';
EnforcerDefinitions.ACTION_READ = 'read';
EnforcerDefinitions.ACTION_WRITE = 'write';
EnforcerDefinitions.PREFIX_USER = 'user';
EnforcerDefinitions.PTYPE_USER = 'p';
EnforcerDefinitions.PREFIX_ROLE = 'role';
EnforcerDefinitions.PTYPE_ROLE = 'g';
// -----------------------------------------------------------------------------------------
class CasbinLBAdapter {
    constructor(datasource) {
        this.datasource = datasource;
        this.logger = logger_helper_1.LoggerFactory.getLogger([CasbinLBAdapter.name]);
    }
    // -----------------------------------------------------------------------------------------
    getRule(id, permissionId, pType) {
        return __awaiter(this, void 0, void 0, function* () {
            let rs = [];
            switch (pType) {
                case EnforcerDefinitions.PTYPE_USER: {
                    rs = [EnforcerDefinitions.PTYPE_USER, `${EnforcerDefinitions.PREFIX_USER}_${id}`];
                    break;
                }
                case EnforcerDefinitions.PTYPE_ROLE: {
                    rs = [EnforcerDefinitions.PTYPE_ROLE, `${EnforcerDefinitions.PREFIX_ROLE}_${id}`];
                    break;
                }
                default: {
                    break;
                }
            }
            if (rs.length < 2) {
                return null;
            }
            const permission = yield this.datasource.execute(`SELECT id, code, name, FROM public."Permission" WHERE id = ${permissionId} `);
            const permissionMapping = yield this.datasource.execute(`SELECT id, user_id, role_id, permission_id FROM public."PermissionMapping" WHERE permission_id = ${permissionId}`);
            rs = [...rs, permission.code, EnforcerDefinitions.ACTION_EXECUTE, permissionMapping.effect];
            return rs.join(',');
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
            if (userId) {
                rs = yield this.getRule(userId, permissionId, EnforcerDefinitions.PTYPE_USER);
            }
            else if (roleId) {
                rs = yield this.getRule(roleId, permissionId, EnforcerDefinitions.PTYPE_ROLE);
            }
            return rs;
        });
    }
    // -----------------------------------------------------------------------------------------
    loadFilteredPolicy(model, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const whereCondition = this.getFilterCondition(filter);
            if (!whereCondition) {
                return;
            }
            const acls = yield this.datasource.execute(`SELECT * FROM public."PermissionMapping" WHERE ${whereCondition}`);
            if ((acls === null || acls === void 0 ? void 0 : acls.length) <= 0) {
                return;
            }
            for (const acl of acls) {
                const policyLine = yield this.generatePolicyLine(acl);
                if (!policyLine || (0, isEmpty_1.default)(policyLine)) {
                    continue;
                }
                casbin_1.Helper.loadPolicyLine(policyLine, model);
                this.logger.info('[loadFilteredPolicy] Load new policy: ', policyLine);
            }
        });
    }
    // -----------------------------------------------------------------------------------------
    isFiltered() {
        return true;
    }
    // -----------------------------------------------------------------------------------------
    loadPolicy(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const acls = yield this.datasource.execute('SELECT * FROM public."PermissionMapping"');
            for (const acl of acls) {
                const policyLine = yield this.generatePolicyLine(acl);
                if (!policyLine || (0, isEmpty_1.default)(policyLine)) {
                    continue;
                }
                casbin_1.Helper.loadPolicyLine(policyLine, model);
                this.logger.info('[loadPolicy] Load new policy: ', policyLine);
            }
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
                case EnforcerDefinitions.PTYPE_USER: {
                    // Remove user policy
                    break;
                }
                case EnforcerDefinitions.PTYPE_ROLE: {
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