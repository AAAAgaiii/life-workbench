import qrcode
url = "https://cdn.jsdelivr.net/gh/AAAAgaiii/life-workbench@main/index.html"
qr = qrcode.QRCode(box_size=10, border=4)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")
out = r"D:/workbuddy/2026-07-30-10-53-45/workbench/手机全屏二维码.png"
img.save(out)
print("QR saved:", out)
