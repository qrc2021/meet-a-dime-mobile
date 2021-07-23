import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  FlatList,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Pressable,
  LogBox,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { GiftedChat, Bubble, Actions } from "react-native-gifted-chat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import styles from "./styles";
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import moment from "moment";
import { useRoute } from "@react-navigation/core";
import { io } from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
export default function ChatScreen({ route, navigation }) {
  const firestore = firebase.firestore();
  const messageRef = useRef("");
  const socketRef = useRef("");
  const matchPhotoRef = useRef("");
  const myPhotoRef = useRef("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const timeoutRef1 = useRef(null);
  const [sentMessage, setSentMessage] = useState(false);
  const [room, setRoom] = useState("");
  const roomRef = useRef("");
  const [socket, setSocket] = useState("");
  const { currentUser, logout } = useAuth();
  const EXPIRE_IN_MINUTES = 1; // 10 minutes

  const modalExpire = 30000; // 30 seconds in MS

  const [match_age, setMatchAge] = useState("");
  const isFocused = useIsFocused();
  const [match_name, setMatchName] = useState("user");
  const [match_sex, setMatchSex] = useState("");
  const [match_photo, setMatchPhoto] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [observerState, setObserverState] = useState(null);
  const [timeoutState, setTimeoutState] = useState(null);
  const [extendedTimeoutState, setExtendedTimeoutState] = useState(null);
  const { match_id, timeout } = route.params;
  const observer = useRef(null);
  const extendedTimeoutRef = useRef();
  var text = "";

  async function fetchMatchInfo() {
    try {
      const token = currentUser && (await currentUser.getIdToken());
      var config = {
        method: "post",
        url: "https://meetadime.herokuapp.com/api/getbasicuser",
        header: {
          "Content-Type": "application/json",
          //   Authorization: `Bearer ${token}`,
        },
        data: { uid: match_id },
      };
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      var response = await axios(config);
      console.log("Fetching data");
      setMatchAge(moment().diff(response.data.birth, "years"));
      setMatchName(response.data.firstName);
      setMatchSex(response.data.sex);
      setMatchPhoto(response.data.photo);

      if (response.data.photo === "/DimeAssets/hearteyes.png") {
        matchPhotoRef.current = "../../../assets" + response.data.photo;
      } else matchPhotoRef.current = response.data.photo;
      myPhotoRef.current = response.data.photo;
    } catch (error) {
      console.log(error);
    }
  }

  function hash_str(str) {
    var hash = 0,
      i,
      chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  function noMatch() {
    if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
    setTimeout(async () => {
      await firestore
        .collection("users")
        .doc(currentUser.uid)
        .update({
          FailMatch: firebase.firestore.FieldValue.arrayUnion(match_id),
        });
      await firestore
        .collection("users")
        .doc(match_id)
        .update({
          FailMatch: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        });
      socketRef.current.emit("leave-room", currentUser.uid, room);
      console.log("LEFT MY ROOM TOO");
      setModalVisible(false);
      if (observer.current !== null) observer.current();
      if (observerState !== null) observerState();
      setObserverState(null);
      observer.current = null;

      if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
      navigation.navigate("After", {
        match_id: match_id,
        type: "user_didnt_go_well",
      });
    }, 0);
  }

  async function setIsChatting() {
    // console.log('Checking searching doc');
    try {
      var myDoc = await firestore
        .collection("searching")
        .doc(currentUser.uid)
        .get();
      if (myDoc.exists) {
        await firestore
          .collection("searching")
          .doc(currentUser.uid)
          .update({ isChatting: 1 });
      } else {
        await firestore
          .collection("searching")
          .doc(match_id)
          .update({ isChatting: 1 });
      }
      console.log("Set is chatting.");
    } catch (error) {
      console.log(error);
    }
  }

  async function noMatchTimeout() {
    var seeker = "none";
    var match = "none";

    try {
      var docRef = firestore.collection("searching").doc(currentUser.uid);
      var doc = await docRef.get();
      if (doc.exists) {
        seeker = currentUser.uid;
        match = match_id;
      } else {
        seeker = match_id;
        match = currentUser.uid;
      }

      if (currentUser.uid === seeker) {
        await firestore.collection("searching").doc(currentUser.uid).update({
          seekerTail: "timeout",
        });
        console.log("I am the seeker, I set my value TIMEOUT.");
      }

      if (currentUser.uid === match) {
        await firestore.collection("searching").doc(match_id).update({
          matchTail: "timeout",
        });
        console.log("I am the match, I set my value TIMEOUT.");
      }
    } catch (error) {
      console.log(error);
    }

    socketRef.current.emit("leave-room-silently", currentUser.uid, room);
    if (observer.current !== null) observer.current();
    if (observerState !== null) observerState();
    setObserverState(null);
    observer.current = null;

    if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
    navigation.navigate("After", { match_id: match_id, type: "timeout" });

    console.log("Left room silently");
  }

  async function pendingMatch() {
    if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
    // This disconnects then sends to the /after page with a state.
    function leavePageWith(stateString) {
      socketRef.current.emit(
        "leave-room-silently",
        currentUser.uid,
        roomRef.current
      );
      setModalVisible(false);
      console.log("going to after page1");
      if (observer.current !== null) observer.current();

      if (observerState !== null) observerState();
      setObserverState(null);
      observer.current = null;
      clearTimeout(extended_timeout);
      clearTimeout(extendedTimeoutRef.current);
      clearTimeout(extendedTimeoutState);
      if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
      navigation.navigate("After", { match_id: match_id, type: stateString });
      console.log("going to after page2");
    }
    // This sets both eachothe to success matches, if we get actually get there.
    async function setSuccessMatches() {
      await firestore
        .collection("users")
        .doc(currentUser.uid)
        .update({
          SuccessMatch: firebase.firestore.FieldValue.arrayUnion(match_id),
        });
      await firestore
        .collection("users")
        .doc(match_id)
        .update({
          SuccessMatch: firebase.firestore.FieldValue.arrayUnion(
            currentUser.uid
          ),
        });
    }

    // This extended timeout waits for an answer.
    var extended_timeout = setTimeout(() => {
      socketRef.current.emit(
        "leave-room-silently",
        currentUser.uid,
        roomRef.current
      );
      setExtendedTimeoutState(extended_timeout);
      extendedTimeoutRef.current = extended_timeout;

      setModalVisible(false);
      if (observer.current !== null) observer.current();

      if (observerState !== null) observerState();
      setObserverState(null);
      observer.current = null;
      if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
      navigation.navigate("After", {
        match_id: match_id,
        type: "extended_timeout",
      });
    }, modalExpire);

    // Save in ref incase a regular abandon occurs.
    extendedTimeoutRef.current = extended_timeout;

    // Identify who is who.
    var seeker = "none";
    var match = "none";

    // There is only one doc. If I am the doc name, I am seeker. else, match
    var docRef = firestore.collection("searching").doc(currentUser.uid);
    var doc = await docRef.get();
    if (doc.exists) {
      seeker = currentUser.uid;
      match = match_id;
    } else {
      seeker = match_id;
      match = currentUser.uid;
    }

    // If im seeker, I need to set my value to true and wait for matchTail.
    if (currentUser.uid === seeker) {
      await firestore.collection("searching").doc(currentUser.uid).update({
        seekerTail: "true",
      });
      console.log("I am the seeker, I set my value true.");
      // Now, check immediately just in case.
      var res = await firestore
        .collection("searching")
        .doc(currentUser.uid)
        .get();
      if (res.data().matchTail === "true") {
        // OTHER PERSON SAID YES!!!!
        setSuccessMatches();
        console.log("match said yes!!");
        clearTimeout(extended_timeout);
        clearTimeout(extendedTimeoutRef.current);
        clearTimeout(extendedTimeoutState);
        clearTimeout(extendedTimeoutRef.current);
        clearTimeout(extendedTimeoutState);

        leavePageWith("match_made");
      } else {
        // Nothing yet, lets wait for a change to the matchTail.
        var localObserver = firestore
          .collection("searching")
          .doc(currentUser.uid)
          .onSnapshot((docSnapshot) => {
            if (
              docSnapshot &&
              docSnapshot.data() &&
              docSnapshot.data().matchTail === "true"
            ) {
              // THEY SAID YES !! (but after)
              setSuccessMatches();
              console.log("other person (the match) said yes after");
              setObserverState(null);
              observer.current = null;
              localObserver();
              clearTimeout(extended_timeout);
              clearTimeout(extendedTimeoutRef.current);
              clearTimeout(extendedTimeoutState);

              leavePageWith("match_made");
            }
            if (
              docSnapshot &&
              docSnapshot.data() &&
              docSnapshot.data().matchTail === "timeout"
            ) {
              // The other person timed out..
              console.log("other person (the match) timed out");
              setObserverState(null);
              observer.current = null;
              localObserver();
              clearTimeout(extended_timeout);
              clearTimeout(extendedTimeoutRef.current);
              clearTimeout(extendedTimeoutState);

              leavePageWith("match_timedout");
            }
          });
        // setObserverState(localObserver);
      }
    }

    // If im match, I need to set my match to true and wait for seekerTail.
    if (currentUser.uid === match) {
      await firestore.collection("searching").doc(match_id).update({
        matchTail: "true",
      });
      console.log("I am the match, I set my value true.");
      // Now, check immediately just in case.
      res = await firestore.collection("searching").doc(match_id).get();
      if (res.data().seekerTail === "true") {
        // OTHER PERSON SAID YES!!!!
        setSuccessMatches();
        console.log("seeker said yes!!");
        clearTimeout(extended_timeout);
        clearTimeout(extendedTimeoutRef.current);
        clearTimeout(extendedTimeoutState);

        leavePageWith("match_made");
      } else {
        // I need to passively listen for a document change.
        var localObserver = firestore
          .collection("searching")
          .doc(match_id)
          .onSnapshot((docSnapshot) => {
            console.log(docSnapshot);
            if (
              docSnapshot &&
              docSnapshot.data() &&
              docSnapshot.data().seekerTail === "true"
            ) {
              // THEY SAID YES !! (but after)
              setSuccessMatches();
              console.log("other person (the seeker) said yes after");

              setObserverState(null);
              observer.current = null;
              localObserver();
              clearTimeout(extended_timeout);
              clearTimeout(extendedTimeoutRef.current);
              clearTimeout(extendedTimeoutState);

              leavePageWith("match_made");
            }
            if (
              docSnapshot &&
              docSnapshot.data() &&
              docSnapshot.data().seekerTail === "timeout"
            ) {
              // The other person timed out..
              console.log("other person (the seeker) timed out");
              setObserverState(null);
              observer.current = null;
              localObserver();
              clearTimeout(extended_timeout);
              clearTimeout(extendedTimeoutRef.current);
              clearTimeout(extendedTimeoutState);

              leavePageWith("match_timedout");
            }
          });
        // setObserverState(localObserver);
      }
    }
  }

  const id = currentUser.uid;

  useEffect(() => {
    LogBox.ignoreLogs(["Animated: `useNativeDriver`"]);
    LogBox.ignoreLogs(["Animated.event now requires"]);
    async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Sorry, we need camera roll permissions for this to work!");
        }
      }
    };
    if (isFocused) {
      fetchMatchInfo();
      setIsChatting();
      var roomInUseEffect = "";
      if (timeout !== null) clearTimeout(timeout);
      const sock = io("https://meetadime.herokuapp.com/");
      sock.auth = { id };
      sock.connect();
      sock.on("connect", () => {
        console.log(
          `Email: "${currentUser.email}" \n With User ID: "${currentUser.uid}" connected with socket id: "${sock.id}"`
        );

        setMessages((previousMessages) => {
          var joinmsg = "sfdg";
          const emojis = ["❤️", "🥰", "😇"];
          var random_emoji = emojis[Math.floor(Math.random() * 3)];
          joinmsg = "Joined the room. Good luck! " + random_emoji;
          GiftedChat.append(previousMessages, {
            _id: currentUser.uid,
            text: joinmsg,
            createdAt: new Date(),
            system: true,
            // Any additional custom parameters are passed through
          });
        });
      });

      const ids = [currentUser.uid, match_id];
      ids.sort();
      const new_room = ids[0] + ids[1];
      roomRef.current = new_room;
      sock.emit(
        "join-room",
        currentUser.uid.toString(),
        new_room.toString(),
        function (message) {
          if (message === "joined") {
            setRoom(new_room);
            roomInUseEffect = new_room;
          }
        }
      );

      setSocket(sock);
      socketRef.current = sock;

      sock.on("message", (message, user, messageID) => {
        var messageId = hash_str(messageID + new Date().toDateString());

        sock.emit(
          "seen-message",
          currentUser.uid,
          new_room,
          messageID,
          function () {}
        );
        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, {
            _id: messageId,
            text: message,
            createdAt: new Date(),
            user: {
              _id: user,
              name: match_name,
              avatar: matchPhotoRef.current,
            },
          })
        );
      });

      sock.on(
        "image",
        (message, user, message_ID) => {
          var messageId = hash_str(message_ID + new Date().toDateString());
          console.log("new image recieved!");
          sock.emit(
            "seen-message",
            currentUser.uid,
            new_room,
            message_ID,
            function () {
              // console.log('I sent to the room that I saw that message.');
            }
          );
          setMessages((previousMessages) =>
            GiftedChat.append(previousMessages, {
              _id: messageId,
              text: "",
              image: message,
              createdAt: new Date(),
              user: {
                _id: user,
                name: match_name,
                avatar: matchPhotoRef.current,
              },
            })
          );
        }
        // console.log(user);
      );

      sock.on("abandoned", (message) => {
        //Somehow show the user their match left

        setTimeout(async () => {
          await firestore
            .collection("users")
            .doc(currentUser.uid)
            .update({
              FailMatch: firebase.firestore.FieldValue.arrayUnion(match_id),
            });
          await firestore
            .collection("users")
            .doc(match_id)
            .update({
              FailMatch: firebase.firestore.FieldValue.arrayUnion(
                currentUser.uid
              ),
            });

          sock.emit("leave-room", currentUser.uid, room);
          // Clear timeouts
          console.log("LEAVING ROOM");
          if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
          if (observer.current !== null) observer.current();
          if (observerState !== null) observerState();
          setObserverState(null);
          observer.current = null;
          if (observerState !== null) observerState();

          observer.current = null;
          navigation.navigate("After", {
            match_id: match_id,
            type: "match_abandoned",
          });
        }, 0);
      });

      setTimeout(() => {
        setModalVisible(true);
      }, EXPIRE_IN_MINUTES * 60000);
      timeoutRef1.current = setTimeout(() => {
        console.log("calling no match timeout");
        setModalVisible(false);
        noMatchTimeout();
      }, EXPIRE_IN_MINUTES * 60000 + modalExpire);
    }
    return () => {
      console.log("left chat, cleaned up.");
      setModalVisible(false);
      if (observer.current !== null) observer.current();
      if (observerState !== null) observerState();
      setObserverState(null);
      observer.current = null;

      if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
      if (timeoutState !== null) clearTimeout(timeoutState);
    };
  }, [isFocused]);

  const onSend = useCallback((newMessage = []) => {
    console.log(newMessage);
    console.log(matchPhotoRef.current);
    var messageId = hash_str(
      newMessage[0].text +
        new Date().toDateString() +
        Math.random(100).toString()
    );

    socketRef.current.emit(
      "send-to-room",
      currentUser.uid,
      roomRef.current,
      newMessage[0].text,
      messageId,
      true,
      () => {}
    );
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessage)
    );
  }, []);

  async function handleReport() {
    var chat_history = [];

    messages.forEach((element) => {
      if (element.image === undefined) chat_history.push(element);
    });
    console.log(chat_history);

    try {
      var result = await firestore
        .collection("reports")
        .doc(currentUser.uid)
        .get();
      if (result.exists) {
        const obj = {};
        obj[match_id] = chat_history;
        await firestore.collection("reports").doc(currentUser.uid).update(obj);
      } else {
        const obj = {};
        obj[match_id] = chat_history;
        await firestore.collection("reports").doc(currentUser.uid).set(obj);
      }
    } catch (error) {
      console.log(error);
    }

    socketRef.current.emit("leave-room", currentUser.uid, roomRef.current);
    console.log("REPORTED OTHER USER.");

    try {
      await firestore
        .collection("users")
        .doc(currentUser.uid)
        .update({
          FailMatch: firebase.firestore.FieldValue.arrayUnion(match_id),
        });
      await firestore
        .collection("users")
        .doc(match_id)
        .update({
          FailMatch: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        });
    } catch (error) {
      console.log(error);
    }
    if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
    if (observer.current !== null) observer.current();
    if (observerState !== null) observerState();
    setObserverState(null);
    observer.current = null;

    navigation.navigate("After", {
      match_id: match_id,
      type: "user_reported",
    });

    return;
  }

  async function handleAbandon() {
    socketRef.current.emit("leave-room", currentUser.uid, roomRef.current);
    await firestore
      .collection("users")
      .doc(currentUser.uid)
      .update({
        FailMatch: firebase.firestore.FieldValue.arrayUnion(match_id),
      });
    await firestore
      .collection("users")
      .doc(match_id)
      .update({
        FailMatch: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
      });
    if (timeoutRef1.current !== null) clearTimeout(timeoutRef1.current);
    if (observer.current !== null) observer.current();
    if (observerState !== null) observerState();
    setObserverState(null);
    observer.current = null;

    navigation.navigate("After", {
      match_id: match_id,
      type: "user_abandoned",
    });
  }
  //   function handleSubmit() {
  //     console.log('Made it to submit');
  //     setSentMessage(true);
  //     var temp = message;
  //     messageArray.push({
  //       key: '1',
  //       message: temp,
  //       author: 'Test author',
  //     });
  //   }

  async function sendImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      base64: true,
      aspect: [4, 3],
      quality: 1,
    });

    let compressed = await ImageManipulator.manipulateAsync(result.uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0,
      base64: true,
    });

    var the_image = compressed.base64;
    // console.log(compressed.base64);
    var image_id = Date().toString();
    socket.emit(
      "send-image-to-room",
      currentUser.uid,
      roomRef.current,
      "data:image/jpeg;base64," + the_image,
      image_id
      // function () {
      //   console.log('recieved on server side.');
      // }
    );

    var messageId = hash_str(image_id + new Date().toDateString());

    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, {
        _id: messageId,
        text: "",
        image: result.uri,
        createdAt: new Date(),
        user: {
          _id: currentUser.uid,
        },
      })
    );
  }
  return (
    <>
      <View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TouchableOpacity style={styles.button} onPress={handleAbandon}>
            <Text>Abandon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleReport}>
            <Text>Report</Text>
          </TouchableOpacity>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            // Alert.alert("Modal has been closed.");
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>
                You did the time, do you want the dime?
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                <Pressable onPress={pendingMatch}>
                  {/* <Text style={styles.textStyle}>Yes</Text> */}
                  <Image
                    style={styles.dimeImages}
                    source={require("../../../assets/DimeAssets/hearteyes.png")}
                  ></Image>
                </Pressable>
                <Pressable onPress={noMatch}>
                  {/* <Text style={styles.textStyle}>No</Text> */}
                  <Image
                    style={styles.dimeImages}
                    source={require("../../../assets/DimeAssets/sleepycoin.png")}
                  ></Image>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      <GiftedChat
        renderBubble={(props) => {
          return (
            <Bubble
              {...props}
              textStyle={{
                right: {
                  color: "white",
                },
              }}
              wrapperStyle={{
                left: {
                  backgroundColor: "#e5e5ea",
                },
                right: {
                  backgroundColor: "#e64398",
                },
              }}
            />
          );
        }}
        renderSystemMessage={(props) => {
          console.log("system");
          return <Text>mesage</Text>;
        }}
        messages={messages}
        onSend={(messages) => onSend(messages)}
        user={{ _id: currentUser.uid }}
        ref={messageRef}
        // renderActions={(props) => {
        //   <TouchableOpacity style={styles.button} onPress={sendImage}>
        //     <Text>Select Image</Text>
        //   </TouchableOpacity>;
        // }}
        renderActions={(props) => {
          return (
            <Actions
              {...props}
              containerStyle={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 4,
                marginRight: 4,
                marginBottom: 0,
              }}
              icon={() => (
                <AntDesign name="pluscircle" size={24} color="black" />
              )}
              options={{
                "Choose From Library": () => {
                  console.log("Choose From Library");
                  sendImage();
                },
                Cancel: () => {
                  console.log("Cancel");
                },
              }}
              optionTintColor="#222B45"
            />
          );
        }}
        alwaysShowSend
        scrollToBottom
      />
    </>
  );
}
