class Message {
    constructor(
        id_user,
        title,
        content,
        publication_date
    ) {
        this.id_user = id_user;
        this.title = title,
        this.content = content;
        this.publication_date = publication_date;
    }
}
module.exports = { Message };
