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
import { useEffect, useState } from "react";

const Header = () => {
  const [isConnectDialogOpen, setConnectDialogOpen] = useState(false);
  const [navValue, setNavValue] = useState("");

  // URLが変更されたときにタブの値を更新
  useEffect(() => {
    // パスから対応するタブの値を設定
    if (location.pathname.includes("/sender")) {
      setNavValue("BulkSender");
    } else if (location.pathname.includes("/app1")) {
      setNavValue("app1");
    } else if (location.pathname.includes("/app2")) {
      setNavValue("app2");
    } else {
      setNavValue(""); // その他のパスの場合
    }
  }, [location.pathname]); // パスが変更されたときだけ実行

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
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              // タブのインジケーター（下線）の色を変更
              "& .MuiTabs-indicator": {
                backgroundColor: "#47dded", // または好みの色
              },
              // 選択されたタブのテキストの色を変更
              "& .Mui-selected": {
                color: "#47dded", // または好みの色
              },
              "& .MuiTab-root:not(.Mui-selected):hover": {
                color: "#47dded",
                opacity: 0.7,
              },
            }}
          >
            <Tab value="BulkSender" label="BulkSender" component={Link} to="/sender" />
            <Tab value="app1" label="app1" component={Link} to="/app1" />
            <Tab value="app2" label="app2" component={Link} to="/app2" />
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
