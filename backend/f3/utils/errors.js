export class F3Error extends Error {
constructor(message, statusCode = 500, code = "F3_ERROR") {
super(message);

```
this.name = "F3Error";
this.statusCode = statusCode;
this.code = code;
```

}
}

export function badRequest(message) {
return new F3Error(message, 400, "BAD_REQUEST");
}

export function notFound(message) {
return new F3Error(message, 404, "NOT_FOUND");
}

export function conflict(message) {
return new F3Error(message, 409, "CONFLICT");
}

export function serviceUnavailable(message) {
return new F3Error(
message,
503,
"SERVICE_UNAVAILABLE"
);
}

export function handleF3Error(error, res) {
const statusCode =
Number.isInteger(error.statusCode) &&
error.statusCode >= 400 &&
error.statusCode <= 599
? error.statusCode
: 500;

if (statusCode >= 500) {
console.error("[F3 Error]", error);
}

return res.status(statusCode).json({
success: false,
error: {
code: error.code || "INTERNAL_SERVER_ERROR",
message:
statusCode >= 500 && !error.statusCode
? "An unexpected server error occurred."
: error.message
}
});
}
