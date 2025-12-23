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
const node_fetch_1 = __importDefault(require("node-fetch"));
const ADMIN_TOKEN = 'temp-admin-token-change-me';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
function updateUserTier() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Updating user tier via admin endpoint...');
            const response = yield (0, node_fetch_1.default)(`${BACKEND_URL}/admin/update-user-tier`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': ADMIN_TOKEN
                },
                body: JSON.stringify({
                    email: 'muppetalert1@protonmail.com',
                    tier: 'BUSINESS',
                    password: 'Panserainer@100'
                })
            });
            const result = yield response.json();
            if (response.ok) {
                console.log('✅ SUCCESS:', result.message);
                console.log('User tier updated successfully to BUSINESS');
            }
            else {
                console.error('❌ ERROR:', result.error);
            }
        }
        catch (error) {
            console.error('❌ Failed to update user tier:', error);
        }
    });
}
updateUserTier();
