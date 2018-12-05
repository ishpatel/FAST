import React from 'react'
import Header from '../Header/header'
import MessageSidebar from './MessageSidebar/message_sidebar'
import './messages.css'
import fire from '../Fire/fire'
import { addToUserList, addToConversationList } from '../Utilities/utilities'

export class Messages extends React.Component {
  constructor(props) {
    super(props);
    this.getConversations = this.getConversations.bind(this);
    this.getActiveConversation = this.getActiveConversation.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.postMessage = this.postMessage.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.handleConfirmTransaction = this.handleConfirmTransaction.bind(this);
    this.handleCancelTransaction = this.handleCancelTransaction.bind(this);
    this.updateButton = this.updateButton.bind(this);

    this.messagesDB = fire.database().ref("Message");
    this.conversationsDB = fire.database().ref("Conversation");
    this.constantsDB = fire.database().ref("Constants");
    this.usersDB = fire.database().ref("Users");
    this.listingsDB = fire.database().ref("Listing");

    this.state = {
      confirmText: "Loading...",
      loaded: false,
      disableButton: true,
      buttonClick: "",
      buttonClass: "messages-confirmtransaction-loading",
      conversations: "",
      listings: ""
    };
  }
  
  _handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.postMessage();
    }
  }
  
  updateButton(listing) {
    var confirmText = "Loading..."
    var disableButton = true;
    var buttonClick = null;
    var buttonClass = 'messages-confirmtransaction-loading';
    this.setState({buttonClick, confirmText, disableButton, buttonClass});
    fire.database().ref().once('value', snapshot => {
      listing["Seller_Confirmed"] = snapshot.child("Listing/" + listing['Listing_ID'] + "/Seller_Confirmed").val();
      if (listing['Is_Transaction_Log']) {
        buttonClick = null;
        confirmText = 'Transaction Complete';
        disableButton = true;
        buttonClass = 'messages-confirmtransaction-complete';
      }
      // Case 2, user is a buyer
      else if (!listing['User_Is_Seller']) {
        buttonClick = listing['Conv_Buyer_Confirmed'] ? this.handleCancelTransaction : this.handleConfirmTransaction;
        confirmText = listing['Conv_Buyer_Confirmed'] ? "Cancel Transaction" : "Confirm Transaction";
        disableButton = false;
        buttonClass = listing['Conv_Buyer_Confirmed'] ? 'messages-confirmtransaction-cancel' : 'messages-confirmtransaction-confirm'
      }
      // Case 2, user is a seller
      else {
        // Subcase, has the listing been confirmed by the seller yet
        if(listing['Seller_Confirmed']) {
          buttonClick = listing['Conv_Seller_Confirmed'] ? this.handleCancelTransaction : null;
          confirmText = listing['Conv_Seller_Confirmed'] ? "Cancel Transaction" : "Already Confirmed";
          disableButton = listing['Conv_Seller_Confirmed'] ? false : true;
          buttonClass = listing['Conv_Seller_Confirmed'] ? 'messages-confirmtransaction-cancel' : 'messages-confirmtransaction-confirmed'
        }
        else {
          buttonClick = this.handleConfirmTransaction;
          confirmText = "Confirm Transaction";
          disableButton = false;
          buttonClass = 'messages-confirmtransaction-confirm'
        }
      }
      this.setState({buttonClick, confirmText, disableButton, buttonClass, activeListing: listing});
    });
  }
  
  getConversations() {
    var userID = this.state.user.uid;
    let listings = [];
    fire.database().ref().once('value', snapshot => {
      // Check if the user has any conversations
      let userConvs = snapshot.child("Users/" + userID + "/Conversations").val().split(",");
      
      // Load in every conversation the user has
      var i;
      for(i = 0; i < userConvs.length; i++) {
        if(userConvs[i] != "") {
          let id = snapshot.child("Conversation/" + userConvs[i] + "/Listing_ID").val();
          let listing = snapshot.child("Listing/" + id).val();
          if(listing != null) {
            listing['Conversation_ID'] = userConvs[i];
            listing['Conv_Seller_Confirmed'] = snapshot.child("Conversation/" + userConvs[i] + "/Seller_Confirm").val();
            listing['Conv_Buyer_Confirmed'] = snapshot.child("Conversation/" + userConvs[i] + "/Buyer_Confirm").val();
            listing['User_Is_Seller'] = (snapshot.child("Conversation/" + userConvs[i] + "/Seller_ID").val() === userID);
            listings.push(listing);
            
            // Appropriately set the class, disable/enable the button, the button text, and onClick
            // Case 1, the listing has already been confirmed
            this.updateButton(listing);
                
            this.setState({currID: userConvs[i], activeListing: listing}, () => {
              this.getMessages();
            });
          }
        }
      }
      this.setState({conversations: userConvs[i], listings: listings.reverse(), loaded: true});
    });
  }

  getActiveConversation(id, listing){
    this.updateButton(listing);
    this.setState({currID: id, activeListing: listing}, () => {
      this.getMessages();
    });
  }

  // If the component gets mounted successfully, authenticate the user
  componentDidMount(){
    this.authListener(() => {
      this.getConversations();
    });
  }

  // Create a method to authenticate the user with our existing database
  authListener(callback) {
    fire.auth().onAuthStateChanged((user) => {
      if(user) {
        this.setState({user});
        callback();
      }
      else {
        this.setState({user: null});
      }
    });
  }

  handleChange(e) {
    this.setState({message: e.target.value});
  }

  postMessage(e) {
    if(this.state.message) {
      const Message = this.state.message;
      const Sender_ID = this.state.user.uid;
      const Conversation_ID = this.state.currID;

      var TimeStamp;
      var Message_ID;
      var idExists = true;
      var d = new Date();
      let messageDB = this.messagesDB;
      let constDB = this.constantsDB
      let messages = [];

      TimeStamp = "" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

      fire.database().ref().once("value").then((snapshot) => {
        Message_ID = snapshot.child("Constants/Next_Message_ID").val();
        idExists = snapshot.child("Message/" + Message_ID).exists();
        while(idExists) {
          Message_ID += 1;
          idExists = snapshot.child("Message/" + Message_ID).exists();
        }
        const NewMessage = {Message, Sender_ID, TimeStamp, Message_ID};
        
        // Add to the new messages list locally
        let messageIDList = snapshot.child("Conversation/" + Conversation_ID + "/Message_List").val().split(",");
        
        // Add the new message to the message list DB
        messageDB.child(Message_ID).set(NewMessage);
        addToConversationList(Conversation_ID, Message_ID);
        constDB.child("Next_Message_ID").set(Message_ID + 1);
      });
      document.getElementById('messages-input').value = '';
    }
  }
 
  getMessages() {
    fire.database().ref().on('value', snapshot => {
      let messages = [];
      let messageIDList = snapshot.child("Conversation/" + this.state.currID + "/Message_List").val().split(",");
      
      // For each message in the list, add them to messages
      var i;
      for(i = 0; i < messageIDList.length; i++) {
        if(messageIDList[i] != "") {
          messages.push(snapshot.child("Message/" + messageIDList[i]).val());
        }
      }
      this.setState({messages: messages});
      var chatScroll = document.getElementById("messageBody");
      chatScroll.scrollTop = chatScroll.scrollHeight;
      
    });
  }
  
  handleConfirmTransaction() {
    // Check if the user is the buyer or seller
    var convID = this.state.currID;
    var userID = this.state.user.uid;
    var listing = this.state.activeListing;
    var buttonClick, confirmText, disableButton, buttonClass;
    fire.database().ref().once('value', snapshot => {
      var listingID = snapshot.child("Conversation/" + convID + "/Listing_ID").val();
      var sellerID = snapshot.child("Conversation/" + convID + "/Seller_ID").val();
      var buyerID = snapshot.child("Conversation/" + convID + "/Buyer_ID").val();
      
      // Buyer confirms transaction
      if(snapshot.child("Conversation/" + convID + "/Buyer_ID").val() === userID) {
        fire.database().ref().child("Conversation/" + convID + "/Buyer_Confirm").set(true);
        listing['Conv_Buyer_Confirmed'] = true;
        
        // If seller has already confirmed, complete the transaction and log it
        if(snapshot.child("Conversation/" + convID + "/Seller_Confirm").val() === true) {
          var d = new Date();
          fire.database().ref().child("Listing/" + listingID + "/Is_Transaction_Log").set(true);
          fire.database().ref().child("Listing/" + listingID + "/Buyer_ID").set(buyerID);
          fire.database().ref().child("Listing/" + listingID + "/Transaction_Date").set(d.getDay() + "-" + d.getMonth() + "-" + d.getYear());
          listing['Is_Transaction_Log'] = true;
          
          // Add the log to both user's transaction histories
          addToUserList(userID, listingID, "Completed_Transactions");
          addToUserList(sellerID, listingID, "Completed_Transactions");
        }
      }
      // Seller confirms transaction
      else {
        fire.database().ref().child("Conversation/" + convID + "/Seller_Confirm").set(true);
        fire.database().ref().child("Listing/" + listingID + "/Seller_Confirmed").set(true);
        listing['Conv_Seller_Confirmed'] = true;
        listing['Seller_Confirmed'] = true;
        if(snapshot.child("Conversation/" + convID + "/Buyer_Confirm").val()) {
          fire.database().ref().child("Listing/" + listingID + "/Is_Transaction_Log").set(true);
          fire.database().ref().child("Listing/" + listingID + "/Transaction_Date").set(d.getDay() + "-" + d.getMonth() + "-" + d.getYear());
          fire.database().ref().child("Listing/" + listingID + "/Buyer_ID").set(buyerID);
          listing['Is_Transaction_Log'] = true;
          
          addToUserList(userID, listingID, "Completed_Transactions");
          addToUserList(buyerID, listingID, "Completed_Transactions");
        }
      }
      this.updateButton(listing);
    });
  }
  
  handleCancelTransaction() {
    // Check if the user is the buyer or seller
    var convID = this.state.currID;
    var userID = this.state.user.uid;
    var listing = this.state.activeListing;
    fire.database().ref().once('value', snapshot => {
      var listingID = snapshot.child("Conversation/" + convID + "/Listing_ID").val();
      var sellerID = snapshot.child("Conversation/" + convID + "/Seller_ID").val();
      var buyerID = snapshot.child("Conversation/" + convID + "/Buyer_ID").val();
      
      // Buyer cancels transaction
      if(snapshot.child("Conversation/" + convID + "/Buyer_ID").val() === userID) {
        fire.database().ref().child("Conversation/" + convID + "/Buyer_Confirm").set(false);
        listing['Conv_Buyer_Confirmed'] = false;
      }
      
      // Seller cancels transaction
      else {
        fire.database().ref().child("Conversation/" + convID + "/Seller_Confirm").set(false);
        fire.database().ref().child("Listing/" + listingID + "/Seller_Confirmed").set(false);
        listing['Conv_Seller_Confirmed'] = false;
        listing['Seller_Confirmed'] = false;
      }
      this.updateButton(listing);
    });
  }

  render() {
    var messages = "Loading...";
    var listings;
    if(this.state.messages && this.state.messages.length >= 0) {
      messages = this.state.messages.map(message =>
        <div className={this.state.user.uid === message['Sender_ID'] ? 'messages-sent' : 'messages-received'} key={message['Listing_ID']}>
          <div className={this.state.user.uid === message['Sender_ID'] ? 'messages-sent-text' : 'messages-received-text'} key={message['Listing_ID']}>
            {message['Message']}
          </div>
          <div className="hover">
          {message['TimeStamps']}
          </div>
        </div>
      );
    }
    if(this.state.loaded && this.state.listings.length === 0) {
      messages = "";
    }
    return (
      <div className="messages">
        <Header />
        {this.state.loaded ?
        <div className="messages-content">
          <MessageSidebar listings={this.state.listings} currID={this.state.currID} callbackFunction={this.getActiveConversation}/>
          <div className="messages-messenger">
            <div className="messages-messages" id="messageBody">
              {messages}
            </div>
            <div className="messages-messenger-container">
              <input className="messages-messenger-input" id="messages-input" onKeyPress={this._handleKeyPress} onChange={this.handleChange}></input>
              <button className="messages-messenger-sender" onClick={this.postMessage}>Send</button>
              <button className={this.state.buttonClass}
              disabled={this.state.disableButton} onClick={this.state.buttonClick}>{this.state.confirmText}</button>
            </div>
          </div>
        </div>
        :
        null}
      </div>
    );
  }
}
