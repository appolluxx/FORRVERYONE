'use strict';

const defaultImage = "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wu9ZJX3StmqqiQ7ukleXOPs69w9ncFjIiqVSo+q4vqEknkncldRMoiIsERERERERERERERERERERERERERERERERERERERERERERERERERERERERERd58I/zI0H37V/nFwYu8+Ef5kaD79q/zitmTf1if3T8QvJfLN+z9P8AjN/C9cs8Snz35T92g+rxKecHH+G8m+9Kf+m5fjXXRHVLKNVsgyCw4lNV2+slhdBO2ohaHgQRtPRzwe9pHUeClPDPppnGBXa+1GW2CW3R1dNEyFz5Y3h7g4kjzHH1jvUhhNhdNzH1nUnBmt5nSYg6u2IXZWxSxrZRp29Oswv6VIaQ4EyNEiJmR2qM8YX+E8Z+5Vf9KNc7LojjBP8AfPGh/wClVf0o1zuorOX67r/5fwNVvyv+qaPqPxKIiKsKfRERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERdXcPev2mWn+mNJjOT3iop6+KqqJXMZRyyANe/dvnNBHcuUUUhhuJVsLrdeiATEb+zxHcq/mXLVnmmzFlelwaHB30SAZAI7Qdtz2Luufis0XcSG3+sPt+T5vhWBNxQaOv35b/VfwCb4VxGisjM9YkzhrPcf6lW7byZYNaeg6p7XD+lXBxE6j4pqHXWWfFqyWoZRRztmMkLo9i4sI9IdfRKp9EVZxLEKuK3T7uuAHOiY42AHj3K82NnTw+3bbUp0t4nnmUREXCutEREREREREREREREREREREREREREREREREREREREREREREREREREREU30j0lyHWXJKnF8arKGmqqahfXvfWPc1hjbJGwgFrXHfeRvh4FWhdOBzWGgo5amlrserpImlwghq5Gvft4N54w3f3kD2ruoYbd3NPqUWEjwVXxPOuX8GvPMMQu2U6ux0uMbHgzEfeueEV14Nwm6kZ3Yfl2jrbRQAVM9JJTVskrJopYZDG9rgGEA8zT4rIyzhC1Gw/G7nlFyu9ikpbVTSVUzIp5S9zGDchoMYG/T1raMGv3U+qKR0xM+CwOeMvecm087b1A7TG/MxHEc+xUYilOmWDSak5tbsMiuTaB1w7XaodF2gZyRuf6O4335du/xWBmmNPw7LbvislYKp1qq5KQzhnIJOR23Ny7nbf1blcZtqooC5j6E6Z8YmO/hWAX1ubo2Qd+kDdUQ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"

class FieldDisplay extends Blockly.Field {
  constructor(opt_value, opt_validator) {
    super(opt_value || defaultImage, opt_validator);

    this.size_ = new Blockly.utils.Size(0, 0);
    this.SERIALIZABLE = true;
    this.CURSOR = 'pointer';
  }

  initView() {
    super.initView();

    this.movableGroup_ = Blockly.utils.dom.createSvgElement('g', {
      'transform': 'translate(5, 5)'
    }, this.fieldGroup_);

    this.preview_ = Blockly.utils.dom.createSvgElement('image', {
      'width': '160',
      'height': '86'
    }, this.movableGroup_);

    this.preview_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '');
  }

  updateEditable() {
    if (!this.fieldGroup_) {
      return;
    }
    super.updateEditable();

    var group = this.getClickTarget_();
    if (!this.isCurrentlyEditable()) {
      group.style.cursor = 'not-allowed';
    } else {
      group.style.cursor = this.CURSOR;
    }
  }

  getText() {
    return "<Image>";
  }

  doClassValidation_(newValue) {
    if (typeof newValue != 'string') {
      return null;
    }
    return newValue;
  }

  doValueUpdate_(newValue) {
    super.doValueUpdate_(newValue);
    this.displayValue_ = newValue;
    this.isValueInvalid_ = false;
  }

  doValueInvalid_(invalidValue) {
    this.displayValue_ = invalidValue;
    this.isDirty_ = true;
    this.isValueInvalid_ = true;
  }

  render_() {
    var value = this.displayValue_;

    if (this.editor_) {
      // this.renderEditor_();
    }

    this.textElement_.style.display = 'none';
    this.textContent_.nodeValue = value;

    var img = new Image();
    img.onload = () => {
      var imgWidth = img.width / 2;
      var imgHeight = img.height / 2;

      if (!this.borderRect_) {
        this.borderRect_ = Blockly.utils.dom.createSvgElement('rect', {
          'x': 0,
          'y': 0,
          'width': (320 / 2) + 10,
          'height': (172 / 2) + 10,
          'style': 'fill: black; fill-opacity: 0.9; border-radius: 4px;',
        }, this.fieldGroup_);
      }

      var clipPath = Blockly.utils.dom.createSvgElement('clipPath', {
        'id': 'clipImage' + this.id_
      }, this.fieldGroup_);

      Blockly.utils.dom.createSvgElement('rect', {
        'x': 0,
        'y': 0,
        'width': 320 / 2,
        'height': 172 / 2
      }, clipPath);

      this.preview_.setAttribute("clip-path", "url(#clipImage" + this.id_ + ")");
      this.preview_.setAttribute("width", imgWidth);
      this.preview_.setAttribute("height", imgHeight);
      this.preview_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', "data:image/png;base64," + value);
    };

    img.src = "data:image/png;base64," + value;
    this.updateSize_();
  }

  updateSize_() {
    this.borderRect_.setAttribute('style', 'fill: black; fill-opacity: 0.9; border-radius: 0;');
    this.borderRect_.setAttribute('width', (320 / 2) + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2);
    this.borderRect_.setAttribute('height', (172 / 2) + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2);
    this.size_.width = (320 / 2) + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2;
    this.size_.height = (172 / 2) + this.constants_.FIELD_BORDER_RECT_X_PADDING * 2;
  }

  showEditor_() {
    var html = `
    <div class="FieldDisplayDropdown">
      <div class="image-preview">
        <canvas class="preview" width="0" height="0"></canvas>
        <div class="size-label"></div>
      </div>
      <div class="control">
        <div>
          <button class="choose-image-btn"><i class="far fa-image"></i> Choose Image</button>
        </div>
        <div style="display: none">
          <div class="label">Size<div class="value size-value">100%</div></div>
          <div class="inp">
            <input type="range" class="size-inp" min="1" max="100" value="100">
          </div>
        </div>
      </div>
    </div>
    `;

    let mainDiv = Blockly.DropDownDiv.getContentDiv();
    mainDiv.innerHTML = html;
    this.editor_ = mainDiv.querySelector(".FieldDisplayDropdown");

    this.editor_.querySelector(".choose-image-btn").addEventListener("click", function (e) {
      let input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png, image/jpeg";
      input.addEventListener("change", function (e) {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];

          if (isElectron) {
            // Electron: เก็บ path ไว้ใช้ fs.readFileSync
            this.fileChoose_ = window.nodeRequire('electron').webUtils.getPathForFile(file);          // <-- Electron เท่านั้นที่มี
            this.selectedFile_ = null;
          } else {
            // Browser: เก็บไฟล์ไว้ แล้วค่อยอ่านผ่าน Object URL/FileReader
            this.selectedFile_ = file;             // <-- เก็บเป็น File object
            this.fileChoose_ = file.name || "";    // เก็บชื่อไว้เผื่อ serialize (ไม่ใช่ path)
          }

          for (let el of this.editor_.querySelectorAll(".control > div")) {
            el.style.display = "block";
          }
          this.updateImagePreview_();
        }
      }.bind(this));
      input.click();
    }.bind(this));

    if (this.fileChoose_ && this.fileChoose_.length > 0) {
      for (let e of this.editor_.querySelectorAll(".control > div")) {
        e.style.display = "block";
      }
    }
    this.editor_.querySelector(".size-value").innerText = `${this.image_resize_}%`;
    this.editor_.querySelector(".size-inp").value = this.image_resize_;

    this.editor_.querySelector(".size-inp").addEventListener("input", function (e) {
      this.image_resize_ = e.target.value;
      this.editor_.querySelector(".size-value").innerText = `${e.target.value}%`;

      this.updateImagePreview_();
    }.bind(this));

    let canvas = this.editor_.querySelector("canvas.preview");
    canvas.width = this.preview_.getAttribute("width") * 2;
    canvas.height = this.preview_.getAttribute("height") * 2;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(this.preview_, 0, 0, this.preview_.getAttribute("width") * 2, this.preview_.getAttribute("height") * 2);

    this.editor_.querySelector(".size-label").innerText = `${canvas.width}x${canvas.height}`;

    // These allow us to have the editor match the block's colour.
    var fillColour = this.sourceBlock_.getColour();
    Blockly.DropDownDiv.setColour(fillColour, this.sourceBlock_.style.colourTertiary);
    Blockly.DropDownDiv.showPositionedByField(this, this.dropdownDispose_.bind(this));
  }

  updateImagePreview_() {
    let size = +this.editor_.querySelector(".size-inp").value;

    // สร้าง <img> สำหรับวาดลง canvas
    let tmpImage = new Image();
    // ปลอดภัยไว้ก่อน (กัน tainted canvas ถ้าไปเจอ CORS เข้ม)
    tmpImage.crossOrigin = "anonymous";

    tmpImage.onload = function () {
      let imageWidth = tmpImage.width;
      let imageHeight = tmpImage.height;

      // คงตรรกะคำนวณสัดส่วนเดิมของคุณ
      let ratio = 1;
      if (imageWidth > imageHeight) {
        if (imageWidth > 320) ratio = 320 / imageWidth;
        if ((imageHeight * ratio) > 172) ratio = 172 / imageHeight;
      } else {
        if (imageHeight > 172) ratio = 172 / imageHeight;
        if ((imageWidth * ratio) > 320) ratio = 320 / imageWidth;
      }

      imageWidth = Math.round(imageWidth * ratio * (size / 100));
      imageHeight = Math.round(imageHeight * ratio * (size / 100));

      this.editor_.querySelector(".size-label").innerText = `${imageWidth}x${imageHeight}`;

      let canvas = this.editor_.querySelector("canvas.preview");
      canvas.width = imageWidth;
      canvas.height = imageHeight;

      let ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tmpImage, 0, 0, imageWidth, imageHeight);

      // ถ้าใช้ Object URL ให้ revoke ทิ้งเมื่อโหลดเสร็จ
      if (tmpImage.__objectURL) {
        URL.revokeObjectURL(tmpImage.__objectURL);
        tmpImage.__objectURL = null;
      }

      this.updateValue_();
    }.bind(this);

    if (isElectron) {
      // อ่านไฟล์ด้วย fs (base64) แล้ว set เป็น data URL
      const contents = nodeFS.readFileSync(this.fileChoose_, { encoding: 'base64' });
      tmpImage.src = "data:image/png;base64," + contents; // หรือ image/jpeg ตามไฟล์จริง
    } else {
      // Browser: ใช้ Object URL (เร็วและไม่ taint)
      if (this.selectedFile_ instanceof File) {
        const url = URL.createObjectURL(this.selectedFile_);
        tmpImage.__objectURL = url;
        tmpImage.src = url;
      } else if (this.fileChoose_) {
        // เผื่อกรณี restore จาก XML มีค่าเก่าเป็น data URL อยู่แล้ว
        // (ถ้าเป็นชื่อไฟล์เฉย ๆ จะโหลดไม่ขึ้น)
        tmpImage.src = this.fileChoose_;
      } else {
        // fallback: ใช้ค่าปัจจุบันใน field (base64) ถ้ามี
        tmpImage.src = "data:image/png;base64," + (this.getValue() || defaultImage);
      }
    }
  }

  updateValue_() {
    let canvas = this.editor_.querySelector("canvas.preview");
    let base64 = canvas.toDataURL("image/jpeg").split(',')[1];
    this.setValue(base64);
    // console.log(base64);
  }

  toXml(fieldElement) {
    fieldElement.textContent = this.value_;
    fieldElement.setAttribute("file", this.fileChoose_ || "");
    fieldElement.setAttribute("resize", this.image_resize_ || 100);
    fieldElement.setAttribute("ImagePositionX", this.image_position_x_ || 0);

    return fieldElement;
  }

  fromXml(fieldElement) {
    this.fileChoose_ = fieldElement.getAttribute("file") || "";
    this.image_resize_ = fieldElement.getAttribute("resize") || 100;
    this.image_position_x_ = fieldElement.getAttribute("ImagePositionX") || 0;
    this.setValue(fieldElement.textContent);
  }

  applyColour() {
    if (!this.sourceBlock_) {
      return;
    }
  }

  dropdownDispose_() {
    delete this.editor_;
  }
}

FieldDisplay.fromJson = function (options) {
  return new this(options['value']);
};

Blockly.fieldRegistry.register('field_display_buildbot', FieldDisplay);

setInterval(function () {
  var workspace = Blockly.getMainWorkspace();
  var allBlocks = workspace.getAllBlocks();
  var displayDrawBlocks = allBlocks.filter(function (block) {
    return block.type === 'display_draw_image';
  });

  displayDrawBlocks.forEach((block) => {
    var xValue = block.getInputTargetBlock('x');
    var yValue = block.getInputTargetBlock('y');
    const imageField = block.getField('image');

    imageField.preview_.setAttribute("x", xValue / 2);
    imageField.preview_.setAttribute("y", yValue / 2);
  });

}, 100);