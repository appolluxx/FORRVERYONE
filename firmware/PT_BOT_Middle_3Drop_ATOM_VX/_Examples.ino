// Motor speed 0-100
void Examples() {
  motorWrite(50, 50, 50, 50);     /* Drive motors forward motorWrite(Motor speed 1, Motor speed 2, Motor speed 3, Motor speed 4) */
  motorWrite(-50, -50, -50, -50); /* Drive motors reverse motorWrite(Motor speed 1, Motor speed 2, Motor speed 3, Motor speed 4) */
  motorWrite(-50, -50, 50, 50);   /* Drive motors spin left motorWrite(Motor speed 1, Motor speed 2, Motor speed 3, Motor speed 4) */
  motorWrite(50, 50, -50, -50);   /* Drive motors spin right motorWrite(Motor speed 1, Motor speed 2, Motor speed 3, Motor speed 4) */
  motorWrite(0, 0, 50, 50);       /* Drive motors curve left motorWrite(Motor speed 1, Motor speed 2, Motor speed 3, Motor speed 4) */
  motorWrite(50, 50, 0, 0);       /* Drive motors curve right motorWrite(Motor speed 1, Motor speed 2, Motor speed 3, Motor speed 4) */
  motorStop();                    /* Stop all motors 4 units */
  delay(100);                     /* Delay duration 1000millisecond = 1 seconds */
  STOP();                         /* To stop, press SW1 or SW2 To proceed with task */

  FF(100); /* Continuous forward straight
      ^ = Speed of all motors 4 units*/

  FF(100, 200); /* Move straight by distance
      |    ^ = Distance timed duration 1000=1seconds
      ^ = Speed of all motors 4 units */

  FF(100, 200, 'L'); /* Move straight by distance, then turn
      |    |    ^ = Select turn direction (Using Gyro IMU)
      |    |        - 'L' = In-place spin left then stop
      |    |        - 'R' = In-place spin right then stop
      |    |        - 'l' = Curve turn left then stop
      |    |        - 'r' = Curve turn right then stop
      |    ^ = Distance timed duration 1000=1seconds
      ^ = Speed of all motors 4 units */

  FF(100, 200, 'R', 110); /* Move straight by distance with timed turn
      |    |    |    ^ = Turn angle degree (Timed 1000=1seconds)
      |    |    ^ = Select turn direction
      |    |        - 'L' = In-place spin left then stop
      |    |        - 'R' = In-place spin right then stop
      |    ^ = Distance timed duration 1000=1seconds
      ^ = Speed of all motors 4 units */

  BB(100); /* Continuous reverse straight
      ^ = Speed of all motors 4 units */

  BB(100, 200); /* Reverse straight by distance
      |    ^ = Distance timed duration 1000=1seconds
      ^ = Speed of all motors 4 units */

  BB(100, 200, 'L'); /* Reverse straight by distance, then turn
      |    |    ^ = Select turn direction (Using Gyro IMU)
      |    |        - 'L' = In-place spin left then stop
      |    |        - 'R' = In-place spin right then stop
      |    |        - 'l' = Curve turn left then stop
      |    |        - 'r' = Curve turn right then stop
      |    ^ = Distance timed duration 1000=1seconds
      ^ = Speed of all motors 4 units */

  BB(100, 200, 'R', 110); /* Reverse straight by distance with timed turn
      |    |    |    ^ = Turn angle degree (Timed 1000=1seconds)
      |    |    ^ = Select turn direction
      |    |        - 'L' = In-place spin left then stop
      |    |        - 'R' = In-place spin right then stop
      |    ^ = Distance timed duration 1000=1seconds
      ^ = Speed of all motors 4 units */

  SetFront(15); /* Align front on black line and stop
            ^ = Speed of all motors 4 units */

  SetFront(15, 300); /* Align front on black line, then reverse away from line
            |   ^ = Timed duration to retreat from black line 1000=1seconds
            ^ = Speed of all motors 4 units */

  SetFront(15, 300, 'R'); /* Align front on black line, then reverse away from line and turn
            |   |    ^ = Select turn direction (Using Gyro IMU)
            |   |        - 'L' = In-place spin left then stop
            |   |        - 'R' = In-place spin right then stop
            |   ^ = Timed duration to retreat from black line 1000=1seconds
            ^ = Speed of all motors 4 units */

  SetFront(15, 300, 'L', 130); /* Align front on black line, then reverse away from line and turn
            |   |    |    ^ = Turn angle degree (Timed 1000=1seconds)
            |   |    ^ = Select turn direction
            |   |        - 'L' = In-place spin left then stop
            |   |        - 'R' = In-place spin right then stop
            |   ^ = Timed duration to retreat from black line 1000=1seconds
            ^ = Speed of all motors 4 units */

  SetBack(15); /* Align rear on black line and stop
           ^ = Speed of all motors 4 units */

  SetBack(15, 300); /* Align rear on black line, then forward away from line
            |   ^ = Timed duration to retreat from black line 1000=1seconds
            ^ = Speed of all motors 4 units */

  SetBack(15, 300, 'R'); /* Align rear on black line, then forward away from line and turn
            |   |    ^ = Select turn direction (Using Gyro IMU)
            |   |        - 'L' = In-place spin left then stop
            |   |        - 'R' = In-place spin right then stop
            |   ^ = Timed duration to retreat from black line 1000=1seconds
            ^ = Speed of all motors 4 units */

  SetBack(15, 300, 'L', 130); /* Align rear on black line, then forward away from line and turn
            |   |    |    ^ = Turn angle degree (Timed 1000=1seconds)
            |   |    ^ = Select turn direction
            |   |        - 'L' = In-place spin left then stop
            |   |        - 'R' = In-place spin right then stop
            |   ^ = Timed duration to retreat from black line 1000=1seconds
            ^ = Speed of all motors 4 units */

  LL(110); /* Spin left timed
      ^ = Turn angle degree (Timed 1000=1seconds) */

  RR(110); /* Spin right timed
      ^ = Turn angle degree (Timed 1000=1seconds) */

  TT(15, 70, 300); /* Curve turn left timed
      |   |   ^ = Turn angle degree (Timed 1000=1seconds)
      |   ^ = Right motors speed
      ^ = Left motors speed */

  TT(70, 15, 300); /* Curve turn right timed
      |   |   ^ = Turn angle degree (Timed 1000=1seconds)
      |   ^ = Right motors speed
      ^ = Left motors speed */

  TTB(15, 70, 300); /* Reverse curve-turn left timed
       |   |   ^ = Turn angle degree (Timed 1000=1seconds)
       |   ^ = Left motors speed
       ^ = Right motors speed */

  TTB(70, 15, 300); /* Reverse curve-turn right timed
       |   |   ^ = Turn angle degree (Timed 1000=1seconds)
       |   ^ = Left motors speed
       ^ = Right motors speed */

  spinDegree(-90); /* Spin left spinDegree(Turn angle using Gyro IMU) */

  spinDegree(90); /* Spin right spinDegree(Turn angle using Gyro IMU) */

  turnDegreeFront(-90); /* Curve turn left turnDegreeFront(Turn angle using Gyro IMU) */

  turnDegreeFront(90); /* Curve turn right turnDegreeFront(Turn angle using Gyro IMU) */

  turnDegreeBack(-90); /* Reverse curve left turnDegreeBack(Turn angle using Gyro IMU) */

  turnDegreeBack(90); /* Reverse curve right turnDegreeBack(Turn angle using Gyro IMU) */

  FF_turn(100, 200); /* Move straight by distance (No ramp acceleration or deceleration) Recommended for use with command turnDregreeFront
           |    ^ = Distance timed duration 1000=1seconds
           ^ = Speed of all motors 4 units */

  BB_turn(100, 200); /* Reverse straight by distance (No ramp acceleration or deceleration) Recommended for use with command turnDegreeBack
           |    ^ = Distance timed duration 1000=1seconds
           ^ = Speed of all motors 4 units */

  turnDegreeFront(15, 70); /* Curve turn left 90 degrees
                  |   ^ = Right motors speed
                  ^ = Left motors speed */

  turnDegreeFront(70, 15); /* Curve turn right 90 degrees
                  |   ^ = Right motors speed
                  ^ = Left motors speed */

  turnDegreeBack(15, 70); /* Reverse curve left 90 degrees
                  |   ^ = Left motors speed
                  ^ = Right motors speed */

  turnDegreeBack(70, 15); /* Reverse curve right 90 degrees
                  |   ^ = Left motors speed
                  ^ = Right motors speed */
                  
  DropF(); /* Drop cubes front-left and front-right, one each 2 items */

  DropFL(); /* Drop cube Front-Left 2 items */

  DropFR(); /* Drop cube Front-Right 2 items */

  DropB(); /* Drop cube Rear */

  DropFL(40); /* Move forward to green target and drop cube Front-Left
        ^ Motor speed 0-100 */

  DropFR(40); /* Move forward to green target and drop cube Front-Right
        ^ Motor speed 0-100 */

  DropB(40); /* Move reverse to green target and drop cube Rear
        ^ Motor speed 0-100 */

  ShowValue_Sensor(); /* Plot sensor values Sensor All 8 units */
}