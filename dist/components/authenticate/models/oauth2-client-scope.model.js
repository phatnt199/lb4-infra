"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2ClientScope = void 0;
const base_1 = require("../../../base");
const repository_1 = require("@loopback/repository");
let OAuth2ClientScope = class OAuth2ClientScope extends base_1.BaseIdEntity {
    constructor(data) {
        super(data);
    }
};
exports.OAuth2ClientScope = OAuth2ClientScope;
__decorate([
    (0, repository_1.property)({
        type: 'string',
        postgresql: { columnName: 'identifier' },
    }),
    __metadata("design:type", String)
], OAuth2ClientScope.prototype, "identifier", void 0);
__decorate([
    (0, repository_1.property)({
        type: 'string',
        postgresql: { columnName: 'name' },
    }),
    __metadata("design:type", String)
], OAuth2ClientScope.prototype, "name", void 0);
__decorate([
    (0, repository_1.property)({
        type: 'string',
        postgresql: { columnName: 'description' },
    }),
    __metadata("design:type", String)
], OAuth2ClientScope.prototype, "description", void 0);
__decorate([
    (0, repository_1.property)({
        type: 'string',
        postgresql: { columnName: 'protocol' },
    }),
    __metadata("design:type", String)
], OAuth2ClientScope.prototype, "protocol", void 0);
exports.OAuth2ClientScope = OAuth2ClientScope = __decorate([
    (0, repository_1.model)({
        settings: {
            postgresql: {
                schema: 'open_auth',
                table: 'ClientScope',
            },
            hiddenProperties: ['createdAt', 'modifiedAt'],
        },
    }),
    __metadata("design:paramtypes", [Object])
], OAuth2ClientScope);
//# sourceMappingURL=oauth2-client-scope.model.js.map