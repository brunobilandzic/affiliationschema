const mongoose = require("mongoose");
mongoose.connect(process.env.mongoConnectionString, {useNewUrlParser: true,  useUnifiedTopology: true, useFindAndModify: false });
const postSchema = new mongoose.Schema({
  author: String,
  title: String,
  post: String,
  category: String,
  likes: Array,
  comments: Array,
  dateAdded: Date
});
const Post = new mongoose.model("Post", postSchema);
module.exports = Post;
