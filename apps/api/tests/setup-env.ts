// Valores seguros para las pruebas. Nunca se usa el .env real ni Atlas.
process.env.NODE_ENV = "test";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/barberos_test";
process.env.JWT_ACCESS_SECRET = "secreto-solo-para-pruebas-0123456789abcdef";
