import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tab,
  Tabs,
  CircularProgress,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { Link } from "react-router-dom";
import { memo, useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "../hooks/UseWallet";

const Header = memo(() => {
  const [navValue, setNavValue] = useState<string | false>(false);
  const { connected, connecting, walletInfo } = useWallet();

  // URLが変更されたときにタブの値を更新
  useEffect(() => {
    if (location.pathname.includes("/bulksender")) {
      setNavValue("BulkSender");
    } else if (location.pathname.includes("/app1")) {
      setNavValue("app1");
    } else if (location.pathname.includes("/app2")) {
      setNavValue("app2");
    } else {
      setNavValue("");
    }
  }, [location.pathname]);

  const navHandleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setNavValue(newValue);
  };

  // ウォレットボタンの内容を決定
  const getWalletButtonContent = () => {
    if (!connected && !connecting) {
      return (
        <>
          <AccountBalanceWalletIcon sx={{ mr: 1 }} />
          Connect Wallet
        </>
      );
    }
    if (connecting) {
      return (
        <>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          Connecting...
        </>
      );
    }

    if (connected) {
      return <>{walletInfo?.shortAddress}</>;
    }
  };

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: "#17062e" }}>
        <Toolbar>
          {/* アイコンを押すとトップページに遷移 */}
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
              "& .MuiTabs-indicator": { backgroundColor: "#47dded" },
              "& .Mui-selected": { color: "#47dded" },
              "& .MuiTab-root:not(.Mui-selected):hover": { color: "#47dded", opacity: 0.7 },
            }}
          >
            <Tab value="BulkSender" label="BulkSender" component={Link} to="/bulksender" />
            <Tab value="app1" label="app1" component={Link} to="/app1" />
            <Tab value="app2" label="app2" component={Link} to="/app2" />
          </Tabs>

          {/* ✅ ウォレット接続状態に応じてアイコンを非表示 */}
          <WalletMultiButton
            style={{
              backgroundColor: "#78c1fd",
              color: "#06234e",
              transition: "all 0.2s ease",
              padding: "8px 15px",
              fontSize: "16px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              gap: connected ? "0px" : "8px", // ✅ 接続時は間隔をなくす
            }}
          >
            {getWalletButtonContent()}
          </WalletMultiButton>
        </Toolbar>
      </AppBar>
    </>
  );
});

export default Header;
