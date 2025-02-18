import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  DialogTitle,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Tab,
  Tabs,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { Link } from "react-router-dom";
import { useState } from "react";

const Header = () => {
  const [isConnectDialogOpen, setConnectDialogOpen] = useState(false);
  const [navValue, setNavValue] = useState("");
  const navHandleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setNavValue(newValue);
  };
  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: "#17062e" }}>
        <Toolbar>
          {/* アイコンを押すとurlのルートに飛ぶようにしておく */}
          <IconButton edge="start" color="inherit" aria-label="menu" component={Link} to="/">
            <RocketLaunchIcon sx={{ color: "#47dded" }} />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, marginLeft: 3 }}>
            AppName
          </Typography>
          <Tabs
            value={navValue}
            onChange={navHandleChange}
            textColor="inherit"
            indicatorColor="secondary"
            aria-label="secondary tabs example"
            sx={{ margin:  "auto" }}
          >
            <Tab value="one" label="Item One" />
            <Tab value="two" label="Item Two" />
            <Tab value="three" label="Item Three" />
          </Tabs>

          <Button
            variant="contained"
            sx={{
              backgroundColor: "#98d0fe",
              color: "#06234e",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "#4eaefc",
              },
            }}
            onClick={() => setConnectDialogOpen(true)}
          >
            Connect
          </Button>
        </Toolbar>
      </AppBar>

      {/* 仮置き */}
      <Dialog
        open={isConnectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <DialogTitle id="dialog-title">Popup Title</DialogTitle>
        <DialogContent>
          <DialogContentText id="dialog-description">
            ここにポップアップ内のコンテンツや情報を記述します。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Header;
