import dotenv from "dotenv";
dotenv.config();

const { default: connectDB } = await import("./src/config/db.js");
const { default: app } = await import("./src/app.js");

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
