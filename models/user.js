const mongodb = require("mongodb");
const getDb = require("../util/database").getDb;

class User {
  constructor(username, email, cart, _id) {
    this.name = username;
    this.email = email;
    this.cart = cart; // {item: []}
    this._id = _id; // userId
  }

  save() {
    const db = getDb();
    let dbOp;

    if (this.name) {
      dbOp = db
        .collection("users")
        .updateOne({ _id: this.name }, { $set: this });
    } else {
      dbOp = db.collection("users").insertOne(this);
    }
    return dbOp
      .then((result) => {
        console.log(result);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  addToCart(product) {
    const db = getDb();
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.item];
    const cartProductIndex = this.cart.item.findIndex((cp) => {
      return cp.productId.toString() === product._id.toString();
    });

    if (cartProductIndex >= 0) {
      newQuantity = this.cart.item[cartProductIndex].quantity + 1;
      updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
      updatedCartItems.push({
        productId: new mongodb.ObjectId(product._id),
        quantity: 1,
      });
    }
    const updatedCart = {
      item: updatedCartItems,
    };
    return db
      .collection("users")
      .updateOne(
        { _id: new mongodb.ObjectId(this._id) },
        { $set: { cart: updatedCart } }
      );
  }

  deleteItemFromCart(productId) {
    const db = getDb();
    let deletedCart;
    deletedCart = this.cart.item.filter((p) => {
      return p.productId.toString() !== productId.toString();
    });
    return db
      .collection("users")
      .updateOne(
        { _id: new mongodb.ObjectId(this._id) },
        { $set: { cart: { item: deletedCart } } }
      );
  }

  getCart() {
    const db = getDb();
    const productIds = this.cart.item.map((i) => i.productId);
    return db
      .collection("products")
      .find({ _id: { $in: productIds } })
      .toArray()
      .then((products) => {
        const productsId = products.map((product) => product._id.toString());
        const mismatchProduct = productIds.filter((p) =>
          productsId.indexOf(p.toString()) > -1 ? false : true
        );
        if (mismatchProduct.length) {
          const filterCart = this.cart.item.filter((p) =>
            productsId.indexOf(p.productId.toString()) > -1 ? true : false
          );
          db.collection("users").updateOne(
            { _id: new mongodb.ObjectId(this._id) },
            { $set: { cart: { item: filterCart } } }
          );
        }
        return products.map((p) => {
          return {
            ...p,
            quantity: this.cart.item.find((i) => {
              return p._id.toString() === i.productId.toString();
            }).quantity,
          };
        });
      });
  }

  addOrder() {
    const db = getDb();
    return this.getCart()
      .then((products) => {
        const order = {
          items: products,
          user: {
            _id: new mongodb.ObjectId(this._id),
            name: this.name,
          },
        };
        console.log(order);
        return db.collection("orders").insertOne(order);
      })
      .then((result) => {
        this.cart = { item: [] };
        return db
          .collection("users")
          .updateOne(
            { _id: new mongodb.ObjectId(this._id) },
            { $set: { cart: { item: [] } } }
          );
      })
      .catch((err) => console.log(err));
  }

  getOrders() {
    const db = getDb();
    return db
      .collection("orders")
      .find({ "user._id": new mongodb.ObjectId(this._id) })
      .toArray();
  }

  static findUserById(userId) {
    const db = getDb();
    return db
      .collection("users")
      .find({ _id: new mongodb.ObjectId(userId) })
      .next()
      .then((user) => {
        console.log(user);
        return user;
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

module.exports = User;
