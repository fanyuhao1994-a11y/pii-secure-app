"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoMaskMiddleware = autoMaskMiddleware;
function maskValue(key, value) {
    if (key === 'phone') {
        return value.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
    }
    if (key === 'email') {
        return value.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    }
    return value;
}
function recursiveMask(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(recursiveMask);
    const maskedObj = {};
    for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'string' && (key === 'phone' || key === 'email')) {
            maskedObj[key] = maskValue(key, val);
        }
        else if (typeof val === 'object' && val !== null) {
            maskedObj[key] = recursiveMask(val);
        }
        else {
            maskedObj[key] = val;
        }
    }
    return maskedObj;
}
function autoMaskMiddleware(req, res, next) {
    const originalJson = res.json;
    res.json = function (body) {
        // 优先读取 JWT 解析出来的 req.user.role，其次读取 Header 请求头
        const userRole = req.user?.role || req.headers['x-user-role'];
        // ADMIN 和 AUDITOR 角色豁免打码
        if (userRole === 'ADMIN' || userRole === 'AUDITOR') {
            return originalJson.call(this, body);
        }
        const sanitizedBody = recursiveMask(body);
        return originalJson.call(this, sanitizedBody);
    };
    next();
}
//# sourceMappingURL=privacy.js.map