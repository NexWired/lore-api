# How to VTube | Remilia Corporation

**Date:** 2022-02-02
**Source:** https://blog.remilia.org/how-to-vtube/

How to VTube

        

        

            
Feb 2, 2022

            
        

        

            

                

VTubing
 is essentially live streaming, but instead of displaying your face, your facial expressions and movements are being tracked on a digital avatar.

What do you need to be a Vtuber

Decent PC/Laptop

Most modern laptops will suffice. This setup guide works on both Windows and OSX.

Camera: Smartphone/Webcam

Newer smartphones have powerful enough cameras to be used for your webcam:

Any iPhone that supports Face ID (iPhone X & above) - 
Check compatibility

Any Android that supports Google ARcore - 
Check compatibility

Using a smartphone for your camera will also require purchasing the $20 VTube Pro app.

Otherwise, any basic webcam with a 1080p resolution will work perfectly - such as the 
Logitech C920 ($60)
 or a 
~$30 Chinese equivalent
.

What Software to Get

You'll just need VTube Studio to track your VR avatar and replace your webcam with it. VTube Studio is free unless you want to use your smartphone in lieu of a webcam, in case it will cost $20 on the app store.

If you want to stream your avatar over any screens, e.g. your desktop, a game or a movie, you'll also need the free streaming software OBS. 

1. Setup VTube Studio

VTube Studio is the only application you need to track your face on a virtual avatar.

Install VTube Studio on Steam:

VTube Studio on Steam

VTube Studio is all you’ll ever need to become a Live2D VTuber, with innovative features such as pinning props to your model and many more still to come.

STEAM

If you don't have Steam you'll need to install it first and create an account.

Select the free version:

Test VTube Studio

Open Steam and goto the Library, find VTube Studio and hit Launch

Select the topmost icon to open up models

There will be a selection of free models to test:

Pick any and it'll load up on your screen after a few seconds, but won't move with your body until we setup the camera.

Setup Camera Tracking

Next we'll setup the camera tracking. Follow the steps either for using a webcam or your smartphone.

Option 1: Webcam

Select the settings icon:

Then the camera icon on the top left

Select Choose Camera

If you're using your webcam, plug it in and you'll see it connected. Select it from the menu.

Next you'll select your resolution and FPS. If on a good computer, use 1920x1080 and 60 FPS; if on an older computer, select 1280 x 720 and 30 FPS. Select any color format.

Lastly, select Tracking Quality. 5 is most computer intensive and 1 is least, so select whatever you think is right. If you're not sure, choose 3, and go down to 2 or 1 if it's slow.

Next select Camera On:

Skip through the popups.

You'll see a face pop up tracking your face:

Stare directly at the camera with a neutral expression and click Calibrate. You can do this any time you feel the face tracking is off.

Option 2: Setup on Smartphone

First make sure your smartphone is compatible:

Any iPhone that supports Face ID (iPhone X & above) - 
Check compatibility

Any Android that supports Google ARcore - 
Check compatibility

You'll need to install VTubeStudio Pro on the app store for $20.

Once it's installed, open it up, then click the model icon at the top to select a model to load.

Then click the camera icon at the top left to connect and let it calibrate. You should see your face with a mask over it, and see the model respond according to the tracking. You can close your face view by clicking the camera again.

Go back to the VRTube open on your PC, and goto the settings and scroll down to Connection Settings:

Turn on Start Server:

Then click Show IP List

A list of numbers will appear. Find the first one under IPv4, starting with 10 (it will look like "10.0.0.333"). This is what you'll enter on the phone app.

Back on your smartphone version of VRTube, goto the settings, scroll down and enter the IPv4 number (the one starting with 10), and toggle on connect to server and streaming mode.

Your model will now move on your PC following your iPhone camera.

2. Replace Your Webcam with your VTube Avatar

Now that your avatar tracking is working, we'll allow the VTube avatar to be used as a replacement for your webcam. This means it'll be usable on Discord or Zoom calls, as well as Youtube or Twitch streams.

Goto settings and camera section and scroll to the bottom to Virtual Webcam Config. Toggle on "Activate Virtual Webcam"

Now when you want to stream somewhere, just select VTubeStudioCam instead of your webcam. For example, in Discord you would goto Voice & Video settings and then select VTubeStudioCam instead of Default.

3. Setup Desktop/Game Livestreaming

VTube Studio will allow you to stream your avatar in front of a plain background, but if you want to overlay your avatar on a window screen, a game or movie, you will need a second software, OBS.

Setup OBS

First install OBS from the site:

Open Broadcaster Software | OBS

OBS (Open Broadcaster Software) is free and open source software for video recording and live streaming. Stream to Twitch, YouTube and many other providers or record your own videos with high quality H264 / AAC encoding.

OBS

Once you open it, it will look like this:

Don't be intimidated, we only need the small sources box in the bottom left. Click the plus sign in the Sources box, then Video Capture Device

Leave the default name and click OK.

In the next pop-up, select Device, and then select VTubeStudioCam:

You should now see your Vtube avatar appear. Click OK to continue.

Make Vtube Background Transparent

Next you'll need to use green screen to remove the background from your avatar.

Go back to VTube Studio, and click the green button on the main menu to change your background:

Select "background_8", the green screen background:

Return to OBS, and look in Sources where you'll see the "Video Capture Device" we added:

Right click it and select Filters

Click the plus at the bottom left under Effect Filters

Select Chroma Key

Hit OK in the Filter name popup

Your avatar will now appear on a transparent grey background, hit close.

Add a Window behind your Avatar

Finally, we'll add a window behind your Avatar. Again, goto the Sources and click the plus, but this time select Window Capture:

Hit OK to move forward:

Then select which specific Window you want to show and hit OK:

You can also select Display Capture to include your entire monitor:

It will now show up on your main screen. It will likely be hiding your VTube avatar, simply right click the window and select Order > Move to Bottom:

You can also resize the windows and move them to where you'd like by dragging them around.

Output a Stream

Now that you're avatar is setup with your screen, you can simply select "OBS VirtualCam" as your webcam anywhere that takes video, such as Discord or Zoom calls, or Youtube Live and Twitch. Instead of showing your webcam, it'll show whatever is on OBS.

Addendum: Add new Live2d Models and Backgrounds

Drag and drop the model folder in to the VTube Model folder:

/SteamLibrary/steamapps/common/Vtube Studio/Vtube Studio_Data/StreamingAssets/Live2DModels
