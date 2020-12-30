import { Button, Dropdown, Menu } from "antd";
import { format, isToday, isTomorrow } from "date-fns";
import { zhCN } from "date-fns/locale";
import React, { PureComponent } from "react";
import { Link } from "react-router-dom";
import { FLAT_SERVER_ROOM } from "../constants/FlatServer";
import { JoinRoomResult, SuccessResponse } from "../UserIndexPage";
import { fetcher } from "../utils/fetcher";
import { globals } from "../utils/globals";
import { Identity } from "../utils/localStorage/room";
import { Status } from "./WeChatLogin";

export type MainRoomListItemProps = {
    /** 标题 */
    title: string;
    /** 开始时间 (UTC 时间戳) */
    beginTime: number;
    /** 结束时间 (UTC 时间戳) */
    endTime?: number;
    /** 状态 */
    status: "Pending" | "Running" | "Stopped";
    /** 房间/周期 uuid */
    uuid: string;
    /** 是否周期房间 */
    isCyclical: boolean;
    /** 发起者 userUUID */
    userUUID: string;

    historyPush: (path: string) => void;
};

/** 房间列表 - 单个房间 */
export class MainRoomListItem extends PureComponent<MainRoomListItemProps> {
    public renderMenu = () => (
        <Menu>
            <Menu.Item>
                <Link to={"/user/room/"}>房间详情</Link>
            </Menu.Item>
            <Menu.Item>修改房间</Menu.Item>
            <Menu.Item>取消房间</Menu.Item>
            <Menu.Item>复制邀请</Menu.Item>
        </Menu>
    );

    public renderDate = () => (
        <time dateTime={new Date(this.props.beginTime).toUTCString()}>
            {format(this.props.beginTime, "MMMM do", { locale: zhCN })}
            {isToday(this.props.beginTime) && " 今天"}
            {isTomorrow(this.props.beginTime) && " 明天"}
        </time>
    );

    public renderState = () => {
        if (this.props.status === "Pending") {
            return <span className="pending">待开始</span>;
        } else if (this.props.status === "Running") {
            return <span className="running">进行中</span>;
        } else if (this.props.status === "Stopped") {
            return <span className="stopped">已结束</span>;
        } else {
            return null;
        }
    };

    public renderDuration = () => {
        return (
            <>
                <span>{format(this.props.beginTime, "HH:mm")}</span>
                <span> ~ </span>
                {this.props.endTime && <span>{format(this.props.endTime, "HH:mm")}</span>}
            </>
        );
    };

    public getUserUUID = () => {
        return localStorage.getItem("userUUID") || "";
    };

    public getIdentity = () => {
        return this.getUserUUID() === this.props.userUUID ? Identity.creator : Identity.joiner;
    };

    public joinRoom = async () => {
        const { isCyclical } = this.props;
        const identity = this.getIdentity();
        const { data: res } = await fetcher.post<SuccessResponse<JoinRoomResult>>(
            isCyclical ? FLAT_SERVER_ROOM.JOIN_CYCLICAL : FLAT_SERVER_ROOM.JOIN_ORDINARY,
            isCyclical ? { periodicUUID: this.props.uuid } : { roomUUID: this.props.uuid },
        );
        if (res.status === Status.Success) {
            const uuid = res.data.whiteboardRoomUUID;
            globals.whiteboard.uuid = res.data.whiteboardRoomUUID;
            globals.whiteboard.token = res.data.whitboardRoomToken;
            let url: string;
            if (identity === Identity.creator) {
                url = `/whiteboard/${Identity.creator}/${uuid}/`;
            } else {
                url = `/whiteboard/${Identity.joiner}/${uuid}/${this.getUserUUID()}/`;
            }
            this.props.historyPush(url);
        }
    };

    render() {
        return (
            <div className="room-list-cell-item">
                <div className="room-list-cell-day">
                    <div className="room-list-cell-modify" />
                    <div className="room-list-cell-title">{this.renderDate()}</div>
                </div>
                <div className="room-list-cell">
                    <div className="room-list-cell-left">
                        <div className="room-list-cell-name">{this.props.title}</div>
                        <div className="room-list-cell-state">{this.renderState()}</div>
                        <div className="room-list-cell-time">{this.renderDuration()}</div>
                    </div>
                    <div className="room-list-cell-right">
                        <Dropdown overlay={this.renderMenu()}>
                            <Button className="room-list-cell-more">更多</Button>
                        </Dropdown>
                        <Button
                            className="room-list-cell-enter"
                            type="primary"
                            onClick={this.joinRoom}
                        >
                            进入房间
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}