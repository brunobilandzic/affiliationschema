const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
mongoose.connect(process.env.mongoConnectionString, {useNewUrlParser: true,  useUnifiedTopology: true , useFindAndModify: false });

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  verified: {type: Boolean, default: false},
  auth: String,
  notifications: Array
});
userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

module.exports = User;
