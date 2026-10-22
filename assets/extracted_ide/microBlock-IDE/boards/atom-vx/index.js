Blockly.Events.disableOrphansCustomForAtomVXBoard = function (event) {
    if (event.type == Blockly.Events.MOVE ||
        event.type == Blockly.Events.CREATE) {
        if (!event.workspaceId) {
            return;
        }
        var workspace = Blockly.Workspace.getById(event.workspaceId);
        if (workspace && !workspace.isDragging()) {
            const valid_top_block = [ 
                "controls_on_start", 
                "controls_forever_no_connect", 
                "procedures_defnoreturn",
                "procedures_defreturn",
                "procedures_mutatorcontainer",
                "procedures_mutatorarg",
                "run_in_background_custom",
                "switch_on_pressed",
                "import",
                "micro_ros_publish_int",
                "micro_ros_publish_string",
                "micro_ros_subscribe_cmd_vel",
                "micro_ros_publish_imu",
                "micro_ros_publish_odom"
            ];

            const blocks = workspace.getAllBlocks(false);
            for (var i = 0, block; (block = blocks[i]); i++) {
                let root = block;
                while (root.getParent()) {
                    root = root.getParent();
                }
                const enabled = valid_top_block.indexOf(root.type) >= 0;
                block.setEnabled(enabled);
            }
        }
    }
};  

addBoard({
    id: "atom-vx",
    name: "Atom VX",
    description: "",
    image: "images/cover.jpg",
    tags: [
        "PT Robotics",
        "ESP32",
        "Robot",
        "IoT"
    ],
    showRosTools: true,
    simulation: {
        package: "package/board.json",
        model: "models/PT-BOT_Atom_VX.glb",
        systemPart: true
    },
    chip: "ESP32",
    script: [ 
        "js/field_display.js",
    ],
    css: [
        "css/field_display.css",
    ],
    blocks: [
        "blocks/blocks_advanced.js",
        "blocks/blocks_io.js",
        "blocks/blocks_sensor.js",
        "blocks/blocks_gamepad.js",
        "blocks/blocks_motor.js",
        "blocks/blocks_servo.js",
        "blocks/blocks_display.js",
        "blocks/blocks_line_follower.js",
        "blocks/blocks_micro_ros.js",

        "blocks/generators_avanced.js",
        "blocks/generators_io.js",
        "blocks/generators_sensor.js",
        "blocks/generators_gamepad.js",
        "blocks/generators_motor.js",
        "blocks/generators_servo.js",
        "blocks/generators_display.js",
        "blocks/generators_line_follower.js",
        "blocks/generators_micro_ros.js",
    ],
    modules: [ ],
    firmware: [
        {
            name: "microPython Atom VX V1",
            path: "firmware/MicroPython.for.Atom.VX1.v1.24.1-dirty.bin",
            version: "v1.24.1-dirty",
            date: "2025-05-14",
            board: "Atom VX",
            cpu: "ESP32"
        },
        {
            name: "microPython Atom VX V2",
            path: "firmware/MicroPython.for.Atom.VX2.v1.24.1-dirty.bin",
            version: "v1.24.1-dirty",
            date: "2025-06-24",
            board: "Atom VX",
            cpu: "ESP32"
        }
    ],
    usb: [
        { 
            vendorId: "10C4",
            productId: "EA60"
        }
    ],
    autoCompletion: { },
    defaultCode: `
        <xml>
            <block type="controls_on_start" x="-12" y="-12">
                <next>
                    <block type="controls_forever_no_connect"></block>
                </next>
            </block>
        </xml>
    `,
    onLoad: async (workspace, board) => {
        workspace.addChangeListener(Blockly.Events.disableOrphansCustomForAtomVXBoard);
    },
    onDispose: async (workspace, board) => {
        workspace.removeChangeListener(Blockly.Events.disableOrphansCustomForAtomVXBoard);
    },
    level: [
        {
            name: "Beginner",
            description: "",
            icon: "../kidbright32/images/puzzle.png",
            blocks: [
                {
                    name: "Control",
                    icon: `/images/icon/process.png`,
                    color: "#fbbd5e",
                    blocks: [
                        {
                            xml: `
                                <block type="controls_wait">
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "controls_forever",
                        {
                            xml: `
                                <block type="controls_repeat_ext">
                                    <value name="TIMES">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="controls_for">
                                    <field name="VAR">i</field>
                                    <value name="FROM">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="TO">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="BY">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                          `
                        },
                        "controls_if",
                        {
                            xml: `
                                <block type="controls_if">
                                    <mutation else="1"></mutation>
                                </block>
                            `
                        },
                        "controls_wait_until",
                        "controls_whileUntil",
                        "controls_flow_statements",
                        "controls_millis"
                    ]
                },
                {
                    name: "Operators",
                    icon: `/images/icon/maths.png`,
                    color: "#293939",
                    blocks: [
                        {
                            xml: '<label text="Math"></label>',
                        },
                        {
                            xml: `
                                <block type="math_number">
                                    <field name="NUM">0</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">ADD</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">MINUS</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">MULTIPLY</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">DIVIDE</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_modulo">
                                    <value name="DIVIDEND">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                    <value name="DIVISOR">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "random_seed",
                        {
                            xml: `
                                <block type="math_random_int">
                                    <value name="FROM">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="TO">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_trig">
                                    <value name="NUM">
                                        <shadow type="math_number">
                                            <field name="NUM">45</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_round">
                                    <field name="OP">ROUND</field>
                                    <value name="NUM">
                                    <shadow type="math_number">
                                        <field name="NUM">3.1</field>
                                    </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Logic"></label>',
                        },
                        {
                            xml: `
                                <block type="logic_boolean">
                                    <field name="BOOL">TRUE</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="logic_compare">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">GT</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="logic_compare">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">LT</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="logic_compare">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">EQ</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "logic_operation",
                        "logic_negate",
                        {
                            xml: '<label text="Text"></label>',
                        },
                        "text",
                        "text_join",
                        {
                            xml: `
                                <block type="logic_compare">
                                    <field name="OP">EQ</field>
                                    <value name="B">
                                        <shadow type="text">
                                            <field name="TEXT">Hello!</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                    ]
                },
                {
                    name: "Variables",
                    icon: `/images/icon/relativity.png`,
                    color: "#ac5e2e",
                    blocks: "VARIABLE"
                },
                {
                    name: "Function",
                    icon: `/images/icon/jigsaw.png`,
                    color: "#17A589",
                    blocks: "PROCEDURE"
                },
                {
                    name: "Advanced",
                    icon: `/images/icon/expert.png`,
                    color: "#8E44AD",
                    blocks: [
                        {
                            xml: '<label text="Dashboard"></label>',
                        },
                        {
                            xml: `
                                <block type="send_into_source">
                                    <value name="value">
                                        <shadow type="math_number">
                                            <field name="NUM">33</field>
                                        </shadow>
                                    </value>
                                    <value name="source">
                                        <shadow type="text">
                                            <field name="TEXT">source1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Debug"></label>',
                        },
                        {
                            xml: `
                                <block type="print">
                                    <value name="value">
                                        <shadow type="text">
                                            <field name="TEXT">Hello, PT Robotics</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Import"></label>',
                        },
                        "import",
                        "call_import",
                        {
                            xml: '<label text="Task"></label>',
                        },
                        "run_in_background_custom",
                        {
                            xml: '<label text="Low Power Mode"></label>',
                        },
                        {
                            xml: `
                                <block type="light_sleep">
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="deep_sleep">
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "is_woke_from_deep_sleep",
                        "board_reset"
                    ]
                },
                {
                    name: "I/O",
                    icon: `images/connector.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Port"></label>',
                        },
                        {
                            xml: `
                                <block type="io_digital_write">
                                    <value name="value">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="io_analog_write">
                                    <value name="value">
                                        <shadow type="math_number">
                                            <field name="NUM">1023</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "io_digital_read",
                        "io_analog_read",
                        {
                            xml: '<label text="Switch"></label>',
                        },
                        "switch_on_pressed",
                        "switch_get_value",
                        "switch_is_press",
                        "switch_is_release",
                        {
                            xml: '<label text="Knob"></label>',
                        },
                        "io_knob_read",
                        {
                            xml: '<label text="Buzzer"></label>',
                        },
                        {
                            xml: `
                                <block type="io_buzzer_beep">
                                    <value name="duration">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                },
                {
                    name: "Sensor",
                    icon: `images/sensor.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="IMU"></label>',
                        },
                        {
                            xml: `
                                <block type="imu_set_offset">
                                    <field name="angle">yaw</field>
                                    <value name="degree">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="imu_read_angle">
                                    <field name="angle">yaw</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="imu_read_quaternion">
                                    <field name="value">0</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="imu_read_accel">
                                    <field name="axis">0</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="imu_read_gyro">
                                    <field name="axis">0</field>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Distance"></label>',
                        },
                        {
                            xml: `
                                <block type="ultrasonic_read_distance">
                                    <field name="trigger_pin">14</field>
                                    <field name="echo_pin">27</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="vl53L0x_read_distance">
                                    <field name="scl_pin">14</field>
                                    <field name="sda_pin">27</field>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Encoder"></label>',
                        },
                        {
                            xml: `
                                <block type="encoder_init">
                                    <field name="pin_a">14</field>
                                    <field name="pin_b">27</field>
                                </block>
                            `
                        },
                        "encoder_read",
                        "encoder_reset",
                        {
                            xml: '<label text="MS200 Lidar"></label>',
                        },
                        "ms200_read",
                        "ms200_read_at_angle"
                    ]
                },
                {
                    name: "Gamepad",
                    icon: `images/gamepad.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="PS4 Controller"></label>',
                        },
                        "gamepad_auto_connect",
                        "gamepad_delete_device",
                        "gamepad_is_connected",
                        "gamepad_read_button",
                        "gamepad_read_analog",
                        "gamepad_read_gyro",
                        "gamepad_read_accel",
                        "gamepad_set_lightbar_color",
                        {
                            xml: `
                                <block type="gamepad_set_rumble">
                                    <value name="duration">
                                        <shadow type="math_number">
                                            <field name="NUM">0.2</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="PS2 Controller"></label>',
                        },
                        "ps2_auto_connect",
                        "ps2_is_connected",
                        "ps2_read_button",
                        "ps2_read_analog"
                    ]
                },
                {
                    name: "Movement",
                    icon: `images/motor.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Basic Motor Control"></label>',
                        },
                        "motor_set",
                        {
                            xml: `
                                <block type="motor_drive_single">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_drive_all">
                                    <value name="speed1">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="speed2">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="speed3">
                                        <shadow type="math_number">
                                            <field name="NUM">-50</field>
                                        </shadow>
                                    </value>
                                    <value name="speed4">
                                        <shadow type="math_number">
                                            <field name="NUM">-50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_spin">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_front">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_back">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_mecanum">
                                    <value name="vx">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="vy">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="r">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_stop"></block>
                            `
                        },
                        {
                            xml: '<label text="Move using IMU"></label>',
                        },
                        {
                            xml: `
                                <block type="motor_set_ramp_using_imu">
                                    <value name="ramp_up">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                    <value name="ramp_down">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_forward_degree">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_backward_degree">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_forward_degree_time">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_backward_degree_time">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_spin_degree">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_angle">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_threshold">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">12</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.6</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_degree_front">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_angle">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_threshold">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `        
                                <block type="motor_turn_degree_back">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_angle">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_threshold">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="DDSM210 Motor"></label>',
                        },
                        {
                            xml: `
                                <block type="ddsm210_init">
                                    <value name="tx">
                                        <shadow type="io_tx_pin">
                                            <field name="pin">27</field>
                                        </shadow>
                                    </value>
                                    <value name="rx">
                                        <shadow type="io_rx_pin">
                                            <field name="pin">14</field>
                                        </shadow>
                                    </value>
                                    <value name="baud">
                                        <shadow type="math_number">
                                            <field name="NUM">115200</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="ddsm210_set_id">
                                    <value name="new_id">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="ddsm210_set_velocity">
                                    <value name="motor_id">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="rpm">
                                        <shadow type="math_number">
                                            <field name="NUM">10.0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="ddsm210_diff_drive">
                                    <value name="linear_x">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                    <value name="angular_z">
                                        <shadow type="math_number">
                                            <field name="NUM">0.0</field>
                                        </shadow>
                                    </value>
                                    <value name="left_id">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="right_id">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                    <value name="wheel_radius">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="wheel_base">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="ddsm210_read_velocity">
                                    <value name="motor_id">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Servo Control"></label>',
                        },
                        {
                            xml: `
                                <block type="servo_set_degree">
                                    <value name="degree">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                },
                {
                    name: "Display",
                    icon: `images/display.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: `
                                <block type="display_draw_text">
                                    <value name="text">
                                        <shadow type="text">
                                            <field name="TEXT">Hello!</field>
                                        </shadow>
                                    </value>
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">60</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">60</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                    <value name="size">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_image">
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_line">
                                    <value name="x1">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="y1">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="x2">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="y2">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_rect">
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="width">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="height">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_circle">
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="r">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_fill">
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="colour_picker">
                                    <field name="COLOUR">#FF0000</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="colour_rgb">
                                    <value name="RED">
                                    <shadow type="math_number">
                                        <field name="NUM">100</field>
                                    </shadow>
                                    </value>
                                    <value name="GREEN">
                                    <shadow type="math_number">
                                        <field name="NUM">50</field>
                                    </shadow>
                                    </value>
                                    <value name="BLUE">
                                    <shadow type="math_number">
                                        <field name="NUM">0</field>
                                    </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "colour_random",
                    ]
                },
                {
                    name: "Follow Line",
                    icon: `images/line_follower.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Config Sensor"></label>',
                        },
                        {
                            xml: `
                                <block type="line_follower_set_sensor">
                                    <value name="left_sensor">
                                        <block type="lists_create_with">
                                            <mutation items="1"></mutation>
                                            <value name="ADD0">
                                                <block type="io_pin">
                                                    <field name="pin">ADC0</field>
                                                </block>
                                            </value>
                                        </block>
                                    </value>
                                    <value name="center_sensor">
                                        <block type="lists_create_with">
                                            <mutation items="6"></mutation>
                                            <value name="ADD0">
                                                <block type="io_pin">
                                                    <field name="pin">ADC1</field>
                                                </block>
                                            </value>
                                            <value name="ADD1">
                                                <block type="io_pin">
                                                    <field name="pin">ADC2</field>
                                                </block>
                                            </value>
                                            <value name="ADD2">
                                                <block type="io_pin">
                                                    <field name="pin">ADC3</field>
                                                </block>
                                            </value>
                                            <value name="ADD3">
                                                <block type="io_pin">
                                                    <field name="pin">ADC4</field>
                                                </block>
                                            </value>
                                            <value name="ADD4">
                                                <block type="io_pin">
                                                    <field name="pin">ADC5</field>
                                                </block>
                                            </value>
                                            <value name="ADD5">
                                                <block type="io_pin">
                                                    <field name="pin">ADC6</field>
                                                </block>
                                            </value>
                                        </block>
                                    </value>
                                    <value name="right_sensor">
                                        <block type="lists_create_with">
                                            <mutation items="1"></mutation>
                                            <value name="ADD0">
                                                <block type="io_pin">
                                                    <field name="pin">ADC7</field>
                                                </block>
                                            </value>
                                        </block>
                                    </value>
                                </block>
                            `
                        },
                        "line_follower_calibrate",
                        "line_follower_switch_min_max",
                        "line_follower_read_line_position",
                        {
                            xml: `
                                <block type="line_follower_read_sensor">
                                    <value name="position">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_read_sensor_calibrated">
                                    <value name="position">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Line Follower"></label>',
                        },
                        {
                            xml: `
                                <block type="line_follower_set_ramp">
                                    <value name="ramp_up">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                    <value name="ramp_down">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line">
                                    <value name="base_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line_time">
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="stop">
                                        <shadow type="logic_boolean">
                                            <field name="BOOL">TRUE</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line_junction">
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="junction">
                                        <shadow type="line_follower_junction">
                                            <field name="junction_type">line_center</field>
                                        </shadow>
                                    </value>
                                    <value name="count">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_point">
                                        <shadow type="line_follower_stop_point">
                                            <field name="stop_point">front</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line_sensor">
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor">
                                            <field name="postion_sensor_type">line_center</field>
                                        </shadow>
                                    </value>
                                    <value name="count">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_move_check_sensor">
                                    <value name="motor_1">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="motor_2">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="motor_3">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="motor_4">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor">
                                            <field name="postion_sensor_type">line_center</field>
                                        </shadow>
                                    </value>
                                    <value name="count">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_spin_check_sensor">
                                    <value name="direction">
                                        <shadow type="line_follower_turn_direction">
                                            <field name="direction">left</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed_time">
                                        <shadow type="math_number">
                                            <field name="NUM">0.05</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor">
                                            <field name="sensor">center</field>
                                            <field name="position">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_turn_check_sensor">
                                    <value name="direction">
                                        <shadow type="line_follower_turn_direction">
                                            <field name="direction">left</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed_time">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor">
                                            <field name="sensor">center</field>
                                            <field name="position">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                },
                {
                    name: "micro ROS",
                    icon: `images/micro_ros.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Initialize"></label>',
                        },
                        {
                            xml: `
                                <block type="wifi_connect">
                                    <value name="ssid">
                                        <shadow type="text">
                                            <field name="TEXT">PT Robotics</field>
                                        </shadow>
                                    </value>
                                    <value name="password">
                                        <shadow type="text">
                                            <field name="TEXT">0824799165</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_init">
                                    <value name="ip_address">
                                        <shadow type="text">
                                            <field name="TEXT">192.168.1.100</field>
                                        </shadow>
                                    </value>
                                    <value name="port">
                                        <shadow type="text">
                                            <field name="TEXT">8888</field>
                                        </shadow>
                                    </value>
                                    <value name="name_space">
                                        <shadow type="text">
                                            <field name="TEXT">robot</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_init_serial">
                                    <value name="tx_pin">
                                        <shadow type="io_tx_pin">
                                            <field name="pin">13</field>
                                        </shadow>
                                    </value>
                                    <value name="rx_pin">
                                        <shadow type="io_rx_pin">
                                            <field name="pin">4</field>
                                        </shadow>
                                    </value>
                                    <value name="baudrate">
                                        <shadow type="math_number">
                                            <field name="NUM">921600</field>
                                        </shadow>
                                    </value>
                                    <value name="name_space">
                                        <shadow type="text">
                                            <field name="TEXT">robot</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Subscribe"></label>',
                        },
                        {
                            xml: `
                                <block type="micro_ros_subscribe_cmd_vel">
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">cmd_vel</field>
                                        </shadow>
                                    </value>
                                    <statement name="callback">
                                        <block type="ddsm210_diff_drive">
                                            <value name="linear_x">
                                                <block type="micro_ros_read_cmd_vel_full">
                                                    <field name="value">0</field>
                                                </block>
                                            </value>
                                            <value name="angular_z">
                                                <block type="micro_ros_read_cmd_vel_full">
                                                    <field name="value">5</field>
                                                </block>
                                            </value>
                                            <value name="left_id">
                                                <shadow type="math_number">
                                                    <field name="NUM">1</field>
                                                </shadow>
                                            </value>
                                            <value name="right_id">
                                                <shadow type="math_number">
                                                    <field name="NUM">2</field>
                                                </shadow>
                                            </value>
                                            <value name="wheel_radius">
                                                <shadow type="math_number">
                                                    <field name="NUM">50</field>
                                                </shadow>
                                            </value>
                                            <value name="wheel_base">
                                                <shadow type="math_number">
                                                    <field name="NUM">70</field>
                                                </shadow>
                                            </value>
                                        </block>
                                    </statement>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_read_cmd_vel_full">
                                    <field name="value">0</field>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Publish"></label>',
                        },
                        {
                            xml: `
                                <block type="micro_ros_publish_int_manual">
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">int32_publisher</field>
                                        </shadow>
                                    </value>
                                    <value name="data">
                                        <shadow type="math_number">
                                            <field name="NUM">123</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_publish_int">
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">int32_publisher</field>
                                        </shadow>
                                    </value>
                                    <value name="data">
                                        <shadow type="math_number">
                                            <field name="NUM">123</field>
                                        </shadow>
                                    </value>
                                    <value name="publish_rate">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_publish_string_manual">
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">string_publisher</field>
                                        </shadow>
                                    </value>
                                    <value name="data">
                                        <shadow type="text">
                                            <field name="TEXT">Hello, PT Robotics</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_publish_string">
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">string_publisher</field>
                                        </shadow>
                                    </value>
                                    <value name="data">
                                        <shadow type="text">
                                            <field name="TEXT">Hello, PT Robotics</field>
                                        </shadow>
                                    </value>
                                    <value name="publish_rate">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_publish_imu">
                                    <value name="qw">
                                        <shadow type="imu_read_quaternion">
                                            <field name="value">0</field>
                                        </shadow>
                                    </value>
                                    <value name="qx">
                                        <shadow type="imu_read_quaternion">
                                            <field name="value">1</field>
                                        </shadow>
                                    </value>
                                    <value name="qy">
                                        <shadow type="imu_read_quaternion">
                                            <field name="value">2</field>
                                        </shadow>
                                    </value>
                                    <value name="qz">
                                        <shadow type="imu_read_quaternion">
                                            <field name="value">3</field>
                                        </shadow>
                                    </value>
                                    <value name="gx">
                                        <shadow type="imu_read_gyro">
                                            <field name="axis">0</field>
                                        </shadow>
                                    </value>
                                    <value name="gy">
                                        <shadow type="imu_read_gyro">
                                            <field name="axis">1</field>
                                        </shadow>
                                    </value>
                                    <value name="gz">
                                        <shadow type="imu_read_gyro">
                                            <field name="axis">2</field>
                                        </shadow>
                                    </value>
                                    <value name="ax">
                                        <shadow type="imu_read_accel">
                                            <field name="axis">0</field>
                                        </shadow>
                                    </value>
                                    <value name="ay">
                                        <shadow type="imu_read_accel">
                                            <field name="axis">1</field>
                                        </shadow>
                                    </value>
                                    <value name="az">
                                        <shadow type="imu_read_accel">
                                            <field name="axis">2</field>
                                        </shadow>
                                    </value>
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">imu</field>
                                        </shadow>
                                    </value>
                                    <value name="publish_rate">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="micro_ros_publish_odom">
                                    <value name="left_rpm">
                                        <shadow type="ddsm210_read_velocity">
                                            <value name="motor_id">
                                                <shadow type="math_number">
                                                    <field name="NUM">1</field>
                                                </shadow>
                                            </value>
                                        </shadow>
                                    </value>
                                    <value name="right_rpm">
                                        <shadow type="ddsm210_read_velocity">
                                            <value name="motor_id">
                                                <shadow type="math_number">
                                                    <field name="NUM">2</field>
                                                </shadow>
                                            </value>
                                        </shadow>
                                    </value>
                                    <value name="wheel_radius">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="wheel_base">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="topic">
                                        <shadow type="text">
                                            <field name="TEXT">odom_raw</field>
                                        </shadow>
                                    </value>
                                    <value name="publish_rate">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                }
            ]
        }
    ]
});
