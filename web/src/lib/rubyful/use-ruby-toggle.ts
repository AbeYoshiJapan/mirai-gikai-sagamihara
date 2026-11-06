import { useEffect, useState } from "react";
import { rubyfulClient } from "./index";
import { useFuriganaSettings } from "./use-furigana-settings";

/**
 * ルビ表示の切り替えロジックを管理するカスタムフック
 *
 * このフックは PopoverContent 内の RubyToggle からのみ使われ、
 * ポップオーバーを開くまでマウントされない。ページ表示のたびに送るべき
 * GAトラッキングは、常時マウントされる RubyfulInitializer 側で行う。
 */
export function useRubyToggle() {
  const { available, defaultOn } = useFuriganaSettings();
  const [rubyEnabled, setRubyEnabled] = useState(false);

  useEffect(() => {
    // LocalStorageから初期状態を取得（未保存ならサイトの既定）
    setRubyEnabled(
      rubyfulClient.getIsEnabledFromStorage({ available, defaultOn })
    );
  }, [available, defaultOn]);

  const handleRubyToggle = (checked: boolean) => {
    setRubyEnabled(checked);

    if (checked) {
      rubyfulClient.show();
    } else {
      rubyfulClient.hide();
    }
    // 画面をリロード
    window.location.reload();
  };

  return {
    /** 管理画面でふりがなを使えるようにしているか（false なら切り替えを出さない） */
    available,
    rubyEnabled,
    handleRubyToggle,
  };
}
