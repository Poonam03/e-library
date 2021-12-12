import React, { Component } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  ToastAndroid,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Permissions from 'expo-permissions';
import firebase from 'firebase';
import db from '../config';

export default class TransScreen extends Component {
  constructor() {
    super();
    this.state = {
      hasCamPermission: null,
      scanned: false,
      buttonState: 'normal',
      scannedBookId: '',
      scannedStudentId: '',
      transMsg: '',
    };
  }

  handleTransaction = async () => {
    var transMsg = null;
    var transType = await this.checkBookAvailability();
    if (!transType) {
      alert('This book does not exist in the database');
      this.setState({ scannedBookId: '', scannedStudentId: '' });
    } else if (transType === 'Issue') {
      var isStudentEligible = await this.checkStudentEligibilityForBookIssued();
      if (isStudentEligible) {
        this.initiateBookIssue();
        alert('Book successfully issued to the student');
      } else {
        isStudentEligible = await this.checkStudentEligibilityForBookReturn();
        if (isStudentEligible) {
          this.initiateBookReturn();
          alert('Book successfully returned');
        }
      }
    }

    /*        db.collection('Book').doc(this.state.scannedBookId).get()
        .then((doc) => {
            var book = doc.data()
            if (book.BookAvail) {
                this.initiateBookIssue()
                transMsg = "Book Issued"
                ToastAndroid.show(transMsg,ToastAndroid.SHORT)
            }
            else {
                this.initiateBookReturn()
                transMsg = "Book Returned"
                ToastAndroid.show(transMsg,ToastAndroid.SHORT)
            }
        })
        this.setState({
            transMsg:transMsg
        }) */
  };

  checkBookAvailability = async () => {
    const bookRef = await db
      .collection('Book')
      .where('BookId', '==', this.state.scannedBookId);
    var transType = '';
    if (bookRef.docs.length === 0) {
      transType = false;
    } else {
      bookRef.docs.map((doc) => {
        var book = doc.data();
        if (book.BookAvail) {
          transType = 'Issue';
        } else {
          transType = 'return';
        }
      });
    }
    return transType;
  };

  checkStudentEligibilityForBookIssued = async () => {
    const studentRef = await db
      .collection('Student')
      .where('StudentId', '==', this.state.scannedStudentId);
    var isStudentEligible = '';
    if (studentRef.docs.length === 0) {
      isStudentEligible = false;
      this.setState({ scannedBookId: '', scannedStudentId: '' });
      alert('This student ID does not exist in the database');
    } else {
      studentRef.docs.map((doc) => {
        var student = doc.data();
        if (student.NoOfBooks < 2) {
          isStudentEligible = true;
          alert('Book successfully issued to the student');
        } else {
          isStudentEligible = false;
          alert('This student has already issued 2 books');
          this.setState({ scannedBookId: '', scannedStudentId: '' });
        }
      });
    }
    return isStudentEligible;
  };

  checkStudentEligibilityForBookReturn = async () => {
    const transRef = await db
      .collection('Transaction')
      .where('BookId', '==', this.state.scannedBookId)
      .limit(1)
      .get();
    var isStudentEligible = '';

    transRef.docs.map((doc) => {
      var lastBookTrans = doc.data();
      if (lastBookTrans.StudentId === this.state.scannedStudentId) {
        isStudentEligible = true;
        alert('Book successfully issued to the student');
      } else {
        isStudentEligible = false;
        alert('The book was not issued to this student');
        this.setState({ scannedBookId: '', scannedStudentId: '' });
      }
    });

    return isStudentEligible;
  };

  initiateBookIssue = async () => {
    db.colletion('Transaction').add({
      StudentId: this.state.scannedStudentId,
      BookId: this.state.scannedBookId,
      date: firebase.firestore.Timestamp.now().toDate(),
      transactionType: 'issued',
    });
    db.collection('Book')
      .doc(this.state.scannedBookId)
      .update({ BookAvail: false });
    db.collection('Student')
      .doc(this.state.scannedBookId)
      .update({ NoOfBooks: firebase.firestore.FieldValue.increment(1) });
    this.setState({ scannedBookId: '', scannedStudentId: '' });
  };

  initiateBookReturn = async () => {
    db.colletion('Transaction').add({
      StudentId: this.state.scannedStudentId,
      BookId: this.state.scannedBookId,
      date: firebase.firestore.Timestamp.now().toDate(),
      transactionType: 'return',
    });
    db.collection('Book')
      .doc(this.state.scannedBookId)
      .update({ BookAvail: true });
    db.collection('Student')
      .doc(this.state.scannedBookId)
      .update({ NoOfBooks: firebase.firestore.FieldValue.increment(-1) });
    this.setState({ scannedBookId: '', scannedStudentId: '' });
  };

  hasCamPermission = async (id) => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCamPermission: status === 'granted',
      scanned: false,
      buttonState: id,
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { buttonState } = this.state;
    if (buttonState === 'BookId') {
      this.setState({
        scannedBookId: data,
        scanned: true,
        buttonState: 'normal',
      });
    } else if (buttonState === 'StudentId') {
      this.setState({
        scannedStudentId: data,
        scanned: true,
        buttonState: 'normal',
      });
    }
  };

  render() {
    const hasCamPermission = this.state.hasCamPermission;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;
    if (buttonState !== 'normal' && hasCamPermission) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    } else if (buttonState === 'normal') {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          behavior="padding"
          enabled>
          <View>
            <Image
              source={require('../assets/booklogo.jpg')}
              style={{ width: 40, height: 40 }}
            />

            <Text style={{ textAlign: 'center', fontSize: 30 }}>
              {' '}
              Willy App{' '}
            </Text>
            <View style={{ flexDirection: 'row', margin: 20 }}>
              <TextInput
                style={{
                  width: 200,
                  height: 40,
                  borderWidth: 1.5,
                  fontSize: 20,
                }}
                placeholder="Book ID"
                onChangeText={(text) =>
                  this.setState({
                    scannedBookId: text,
                  })
                }
                value={this.state.scannedBookId}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: 'violet',
                  width: 50,
                  borderWidth: 1.5,
                }}
                onPress={() => {
                  this.getCamPermission('BookId');
                }}>
                <Text> Scan </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', margin: 20 }}>
              <TextInput
                style={{
                  width: 200,
                  height: 40,
                  borderWidth: 1.5,
                  fontSize: 20,
                }}
                placeholder="Student ID"
                onChangeText={(text) =>
                  this.setState({
                    scannedStudentId: text,
                  })
                }
                value={this.state.scannedStudentId}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: 'violet',
                  width: 50,
                  borderWidth: 1.5,
                }}
                onPress={() => {
                  this.getCamPermission('StudentId');
                }}>
                <Text> Scan </Text>
              </TouchableOpacity>
            </View>
            <View>
              {' '}
              <TouchableOpacity
                style={{
                  backgroundColor: 'violet',
                  width: 50,
                  borderWidth: 1.5,
                }}
                onPress={async () => {
                  var transMsg = this.handleTransaction();
                  this.setState({
                    scannedBookId: [],
                    scannedStudentId: [],
                  });
                }}>
                <Text> Submit </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
    }
  }
}
