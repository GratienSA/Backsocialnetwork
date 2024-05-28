class Comment {
    constructor(id_comment, id_message, id_user, content, comment_date) {
      this.id_comment = id_comment;
      this.id_message = id_message;
      this.id_user = id_user;
      this.content = content;
      this.comment_date = comment_date;
    }
  }
  
  module.exports = { Comment };
  